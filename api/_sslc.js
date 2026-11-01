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

export const PROJECT = process.env.FIREBASE_PROJECT_ID || 'kyvro-admin-auth';
export const SITE = (process.env.SITE_URL || 'https://kyvro.store').replace(/\/$/, '');
export const LIVE = String(process.env.SSLCOMMERZ_LIVE || '').toLowerCase() === 'true';
export const SSL_BASE = LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;

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
async function accessToken() {
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const sa = readServiceAccount();
  if (!sa || !sa.client_email || !sa.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in Vercel.');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
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

const val = (f) => {
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return Number(f.doubleValue);
  if ('booleanValue' in f) return f.booleanValue;
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

// Marks the order Paid (+ a line in the activity trail). Only called after SSLCommerz confirmed the payment.
export async function markPaid(orderNumber, info) {
  const token = await accessToken();
  const str = (s) => ({ stringValue: String(s || '').slice(0, 200) });
  const now = new Date().toISOString();
  const body = {
    writes: [{
      update: {
        name: `projects/${PROJECT}/databases/(default)/documents/orders/${orderNumber}`,
        fields: {
          paymentStatus: str('Paid'),
          paidAt: { timestampValue: now },
          paymentTranId: str(info.tranId),
          paymentBankTranId: str(info.bankTranId),
          paymentChannel: str(info.channel),
          paymentAmount: { doubleValue: Number(info.amount) || 0 },
          updatedAt: { timestampValue: now },
        },
      },
      updateMask: { fieldPaths: ['paymentStatus', 'paidAt', 'paymentTranId', 'paymentBankTranId', 'paymentChannel', 'paymentAmount', 'updatedAt'] },
      updateTransforms: [{
        fieldPath: 'history',
        appendMissingElements: { values: [{ mapValue: { fields: {
          status: str('Payment received'),
          by: str(''),
          byName: str(`SSLCommerz${info.channel ? ' · ' + info.channel : ''}`),
          at: str(now),
        } } }] },
      }],
      currentDocument: { exists: true },
    }],
  };
  const r = await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Could not mark the order paid.');
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

// Checks a callback / IPN against SSLCommerz AND against the saved order, then marks it Paid.
// Returns { ok, orderNumber, reason }
export async function confirmPayment(valId) {
  if (!valId) return { ok: false, reason: 'no val_id' };
  const v = await validatePayment(valId);
  const orderNumber = v.value_a || '';
  if (!['VALID', 'VALIDATED'].includes(v.status)) return { ok: false, orderNumber, reason: `status ${v.status}` };
  const order = await getOrder(orderNumber);
  if (!order) return { ok: false, orderNumber, reason: 'order not found' };
  if (order.paymentStatus === 'Paid') return { ok: true, orderNumber, already: true };
  if (order.paymentMethod !== 'Online Payment') return { ok: false, orderNumber, reason: 'not an online order' };
  if (String(v.currency_type || v.currency || 'BDT').toUpperCase() !== 'BDT') return { ok: false, orderNumber, reason: 'currency' };
  if (!(Math.abs(Number(v.amount) - Number(order.total)) < 0.01)) return { ok: false, orderNumber, reason: 'amount mismatch' };
  if (String(v.risk_level) === '1') return { ok: false, orderNumber, reason: 'risky payment, check it in the SSLCommerz panel' };
  await markPaid(orderNumber, { tranId: v.tran_id, bankTranId: v.bank_tran_id, channel: v.card_type || v.card_issuer || '', amount: v.amount });
  return { ok: true, orderNumber };
}
