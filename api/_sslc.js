// Shared helpers for the SSLCommerz online payment (bKash + cards). Files starting with "_" are not public endpoints.
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   SSLCOMMERZ_STORE_ID        Store ID from SSLCommerz (sandbox: the test store id)
//   SSLCOMMERZ_STORE_PASSWORD  Store password from SSLCommerz
//   SSLCOMMERZ_LIVE            "true" for real payments. Leave it out (or "false") to use the SANDBOX (test money).
//   SSLCOMMERZ_METHODS         optional, only show these methods, e.g. "bkash,visa,mastercard,amex"
//   FIREBASE_SERVICE_ACCOUNT   the same service account JSON used for notifications (to mark the order Paid)
//   FIREBASE_PROJECT_ID        optional, default kyvro-admin-auth
//   SITE_URL                   optional, default https://kyvro.store

import crypto from 'node:crypto';
import { checkOrderPrices, normalizePlans, orderVisibleIds, shopIsPaid, basicDue } from '../src/data/priceCheck.js';

export const PROJECT = process.env.FIREBASE_PROJECT_ID || 'kyvro-admin-auth';
export const SITE = (process.env.SITE_URL || 'https://kyvro.store').replace(/\/$/, '');
export const LIVE = String(process.env.SSLCOMMERZ_LIVE || '').toLowerCase() === 'true';
export const SSL_BASE = LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
export const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;

export const sslConfigured = () => !!(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);

function readServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) return null;
  raw = raw.trim();
  if (raw[0] !== '{') raw = Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

let cached = { token: '', exp: 0 };
export async function accessToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const sa = readServiceAccount();
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in Vercel.');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || 'Could not log in to Firebase.');
  cached = { token: j.access_token, exp: Date.now() + 50 * 60 * 1000 };
  return cached.token;
}

// Firestore answers 429 when the free plan's daily reads are used up (Spark: 50,000 a day, back at 14:00 Bangladesh time)
// short: when it opens again (midnight Pacific = 08:00 UTC = 2 PM Bangladesh) and how long until then
export function quotaMsg(now = Date.now()) {
  const d = new Date(now); const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8);
  const left = Math.max(0, (next > now ? next : next + 86400000) - now);
  const h = Math.floor(left / 3600000), m = Math.ceil((left % 3600000) / 60000);
  return `Database limit used up for today. Opens again at 2 PM (in ${h ? `${h} h ` : ''}${m} min).`;
}

export const val = (f) => {
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return Number(f.doubleValue);
  if ('booleanValue' in f) return f.booleanValue;
  if ('timestampValue' in f) return f.timestampValue; // ISO text
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, val(v)]));
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(val);
  return undefined;
};

// The order exactly as saved in Firestore (the amount to pay always comes from here, never from the browser)
export async function getOrder(orderNumber) {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(String(orderNumber || ''))) return null;
  const token = await accessToken();
  const r = await fetch(`${FS}/documents/orders/${encodeURIComponent(orderNumber)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Could not read the order.');
  const d = await r.json();
  const o = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
  o.id = orderNumber;
  return o;
}

// Reads one document (null when it does not exist)
async function getDocument(path) {
  const token = await accessToken();
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Could not read ${path}.`);
  const d = await r.json();
  return Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
}

// The browser saves the order, so its prices are checked here against the live products (and the shop) before any
// payment page opens. Returns { ok, problems }.
export async function verifyOrderPrices(order) {
  const ids = [...new Set((order.items || []).map((it) => String(it.id)).filter((id) => /^[A-Za-z0-9_-]{1,60}$/.test(id)))];
  const list = await Promise.all(ids.map((id) => getDocument(`products/${id}`)));
  const productsById = Object.fromEntries(ids.map((id, i) => [id, list[i]]).filter(([, p]) => p));
  const shop = order.shop && /^[a-z0-9-]{3,40}$/.test(String(order.shop)) ? await getDocument(`shops/${order.shop}`) : null;
  // a seller's store whose Basic is not paid is closed to customers: no order from it
  if (shop && shop.kind === 'seller' && shop.basicFree === false) {
    const plansNow = normalizePlans(await getDocument('settings/plans'));
    if (basicDue(shop, plansNow)) return { ok: false, problems: ['This shop is closed right now.'], subtotal: 0 };
  }
  // a shop whose paid plan ran out sells only its best sellers (the same products the storefront still shows)
  let visible = null;
  if (shop && !shopIsPaid(shop) && shop.planExempt !== true) {
    const plans = normalizePlans(await getDocument('settings/plans'));
    const all = Object.keys(shop.items || {});
    if (plans.enabled && all.length > plans.freeLimit) {
      const extra = all.filter((id) => !productsById[id] && /^[A-Za-z0-9_-]{1,60}$/.test(id));
      const more = await Promise.all(extra.map((id) => getDocument(`products/${id}`)));
      const everyone = { ...productsById, ...Object.fromEntries(extra.map((id, i) => [id, more[i]]).filter(([, p]) => p)) };
      visible = orderVisibleIds(order, shop, everyone, plans);
    }
  }
  // a main store promo code: the Owner's codes in settings/promos
  const promos = order.coupon && !order.shop ? await getDocument('settings/promos') : null;
  // the full-look discount: the real pieces of each look it names
  let lookItems = null;
  if (order.lookOff && Array.isArray(order.lookOff.looks)) {
    const ids = order.lookOff.looks.map(String).filter((id) => /^look-[0-9]{10,16}$/.test(id)).slice(0, 5);
    const docs = await Promise.all(ids.map((id) => getDocument(`looks/${id}`)));
    lookItems = Object.fromEntries(ids.map((id, i) => [id, docs[i] && docs[i].active !== false ? (docs[i].items || []).map((it) => String(it.id)) : []]));
  }
  return checkOrderPrices(order, productsById, shop, visible, promos, lookItems);
}

// Writes the payment result into the order (+ a line in the activity trail). Only called after SSLCommerz confirmed it.
//   kind "full"    : the whole order was paid online  -> paymentStatus = Paid
//   kind "advance" : Cash on Delivery order, the customer paid the DELIVERY CHARGE online -> advancePaid = amount
export async function markPaid(orderNumber, info, kind = 'full') {
  const token = await accessToken();
  const str = (s) => ({ stringValue: String(s || '').slice(0, 200) });
  const now = new Date().toISOString();
  const channel = info.channel ? ' · ' + info.channel : '';
  const fields = kind === 'advance'
    ? {
        advancePaid: { doubleValue: Number(info.amount) || 0 },
        advancePaidAt: { timestampValue: now },
        advanceTranId: str(info.tranId),
        advanceBankTranId: str(info.bankTranId),
        advanceChannel: str(info.channel),
        updatedAt: { timestampValue: now },
      }
    : {
        paymentStatus: str('Paid'),
        paidAt: { timestampValue: now },
        paymentTranId: str(info.tranId),
        paymentBankTranId: str(info.bankTranId),
        paymentChannel: str(info.channel),
        paymentAmount: { doubleValue: Number(info.amount) || 0 },
        updatedAt: { timestampValue: now },
      };
  const body = {
    writes: [{
      update: { name: `projects/${PROJECT}/databases/(default)/documents/orders/${orderNumber}`, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      updateTransforms: [{
        fieldPath: 'history',
        appendMissingElements: { values: [{ mapValue: { fields: {
          status: str(kind === 'advance' ? 'Delivery charge paid online' : 'Payment received'),
          by: str(''),
          byName: str(`${info.gateway || 'SSLCommerz'}${channel}`),
          at: str(now),
        } } }] },
      }],
      currentDocument: { exists: true },
    }],
  };
  const r = await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Could not mark the order paid.');
}

// What the customer has to pay online right now for this order:
//   Online Payment order            -> the whole total
//   Cash on Delivery order          -> the delivery charge only (the rest is paid when the parcel arrives)
// Returns { kind, amount } or { error }
export function amountDue(order) {
  if (order.status === 'Cancelled') return { error: 'This order was cancelled.' };
  if (order.paymentMethod === 'Manual bKash / Nagad') return { error: 'This order is paid by manual bKash / Nagad. The team will verify it.' };
  if (order.paymentMethod === 'Online Payment') {
    if (order.paymentStatus === 'Paid') return { error: 'This order is already paid.' };
    return { kind: 'full', amount: Number(order.total) };
  }
  if (order.advancePaid > 0) return { error: 'The delivery charge is already paid.' };
  const fee = Number(order.shipping) || 0;
  if (fee <= 0) return { error: 'This order has no delivery charge to pay online.' };
  return { kind: 'advance', amount: fee };
}

// Asks SSLCommerz whether the payment really happened. Returns the verified result.
export async function validatePayment(valId) {
  const q = new URLSearchParams({
    val_id: String(valId),
    store_id: process.env.SSLCOMMERZ_STORE_ID || '',
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    format: 'json',
  });
  const r = await fetch(`${SSL_BASE}/validator/api/validationserverAPI.php?${q}`);
  if (!r.ok) throw new Error('SSLCommerz validation failed.');
  return r.json();
}

// Checks a callback / IPN against SSLCommerz AND against the saved order, then saves the payment on the order.
// Returns { ok, orderNumber, kind, amount, reason }
export async function confirmPayment(valId) {
  if (!valId) return { ok: false, reason: 'no val_id' };
  const v = await validatePayment(valId);
  const orderNumber = v.value_a || '';
  const kind = v.value_b === 'advance' ? 'advance' : 'full';
  if (!['VALID', 'VALIDATED'].includes(v.status)) return { ok: false, orderNumber, kind, reason: `status ${v.status}` };
  const order = await getOrder(orderNumber);
  if (!order) return { ok: false, orderNumber, kind, reason: 'order not found' };
  if (order.paymentMethod === 'Manual bKash / Nagad') return { ok: false, orderNumber, kind, reason: 'manual payment order' };
  const amount = Number(v.amount);
  // what this order really asks for (never trust the browser or the gateway fields alone)
  const expected = kind === 'advance'
    ? (order.paymentMethod === 'Online Payment' ? null : Number(order.shipping) || 0)
    : (order.paymentMethod === 'Online Payment' ? Number(order.total) : null);
  if (expected === null || !(expected > 0)) return { ok: false, orderNumber, kind, reason: 'payment type does not match the order' };
  if (kind === 'full' && order.paymentStatus === 'Paid') return { ok: true, orderNumber, kind, amount, already: true };
  if (kind === 'advance' && order.advancePaid > 0) return { ok: true, orderNumber, kind, amount, already: true };
  if (String(v.currency_type || v.currency || 'BDT').toUpperCase() !== 'BDT') return { ok: false, orderNumber, kind, reason: 'currency' };
  if (!(Math.abs(amount - expected) < 0.01)) return { ok: false, orderNumber, kind, reason: 'amount mismatch' };
  if (String(v.risk_level) === '1') return { ok: false, orderNumber, kind, reason: 'risky payment, check it in the SSLCommerz panel' };
  await markPaid(orderNumber, { tranId: v.tran_id, bankTranId: v.bank_tran_id, channel: v.card_type || v.card_issuer || '', amount }, kind);
  return { ok: true, orderNumber, kind, amount };
}
