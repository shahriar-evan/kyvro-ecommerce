// Shared helpers for the shop plan (subscription) payment. Files starting with "_" are not public endpoints.
//
// The price ALWAYS comes from settings/plans on the server, never from the browser. subscriptions/{uid} is written only
// here (service account, api/plan.js), and every UddoktaPay invoice can extend a plan only once (subscriptionPayments/{invoiceId}).
//
// UddoktaPay has no recurring / automatic charge API (only create charge, verify, webhook, refund), so a plan is renewed
// by hand: the shop owner presses "Renew" and pays again. Each payment adds periodDays.

import { PROJECT, FS, accessToken, val } from './_sslc.js';
import { UDDOKTA_BASE, UDDOKTA_KEY } from './_uddokta.js';
import { normalizePlans, planPrice, toMillis } from '../src/data/priceCheck.js';

const DOCS = `projects/${PROJECT}/databases/(default)/documents`;
const fields = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));

async function readDoc(token, path) {
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Could not read ${path}.`);
  const d = await r.json();
  return { data: fields(d), updateTime: d.updateTime };
}

export async function readPlans(token) {
  const d = await readDoc(token || (await accessToken()), 'settings/plans');
  return normalizePlans(d && d.data);
}

// Who is calling: their Firebase login token must be accepted by Firestore (reading their own team entry proves it),
// and they must be an active Manager or Admin (the Owner has no plan). Returns { uid, email, name } or { error, status }.
export async function planCaller(req) {
  const auth = req.headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let claims = {};
  try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')); } catch (e) { /* bad token */ }
  const email = String(claims.email || '').toLowerCase();
  const uid = String(claims.sub || claims.user_id || '');
  if (!email || !uid) return { error: 'Please sign in.', status: 401 };
  const r = await fetch(`${FS}/documents/admins/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!r.ok) return { error: 'Only team members with a shop can buy a plan.', status: 403 };
  const me = fields(await r.json());
  if (me.active === false || !['manager', 'admin'].includes(me.role || 'admin')) return { error: 'Only Managers and Admins buy a plan.', status: 403 };
  return { uid, email, name: String(me.name || '') };
}

// Copies the plan end date onto the person's shops (the storefront reads it there; subscriptions are private)
export async function syncShops(token, uid, paidUntilIso) {
  const r = await fetch(`${FS}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'shops' }], where: { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: uid } } } } }),
  });
  if (!r.ok) return 0;
  const rows = (await r.json()).filter((x) => x.document);
  if (!rows.length) return 0;
  const writes = rows.map((x) => ({
    update: { name: x.document.name, fields: { paidUntil: { timestampValue: paidUntilIso } } },
    updateMask: { fieldPaths: ['paidUntil'] },
    currentDocument: { exists: true },
  }));
  await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  return rows.length;
}

// Asks UddoktaPay whether the invoice is really paid, checks it is a plan payment for the amount the server asked for,
// then extends the plan: paidUntil = max(now, current paidUntil) + periodDays. The same invoice never extends twice.
// Returns { ok, already?, paidUntil?, reason? }
export async function confirmPlanPayment(invoiceId) {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(invoiceId || ''))) return { ok: false, reason: 'no invoice_id' };
  const r = await fetch(`${UDDOKTA_BASE}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'RT-UDDOKTAPAY-API-KEY': UDDOKTA_KEY },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
  const v = await r.json().catch(() => ({}));
  const status = String(v.status || '').toUpperCase();
  if (status !== 'COMPLETED') return { ok: false, pending: status === 'PENDING', reason: `status ${v.status || r.status}` };
  const meta = (v && typeof v.metadata === 'object' && v.metadata) || {};
  if (meta.kind !== 'plan') return { ok: false, reason: 'not a plan payment' };
  const uid = String(meta.uid || '');
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return { ok: false, reason: 'no uid' };
  // the amount was decided by the server when the payment was created (from settings/plans) and travels in the metadata
  const expected = Number(meta.amount);
  const amount = Number(v.amount);
  if (!(expected > 0) || !(amount + 0.01 >= expected)) return { ok: false, reason: 'amount mismatch' };

  const token = await accessToken();
  const plans = await readPlans(token);
  const days = Number(meta.days) > 0 ? Number(meta.days) : plans.periodDays;
  const paymentPath = `${DOCS}/subscriptionPayments/${invoiceId}`;
  const subPath = `${DOCS}/subscriptions/${uid}`;
  // retry a few times when another payment of the same person changed the plan at the same moment
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await readDoc(token, `subscriptionPayments/${invoiceId}`)) {
      const cur = await readDoc(token, `subscriptions/${uid}`);
      return { ok: true, already: true, uid, paidUntil: cur && cur.data.paidUntil };
    }
    const sub = await readDoc(token, `subscriptions/${uid}`);
    const now = Date.now();
    const from = Math.max(now, toMillis(sub && sub.data.paidUntil));
    const until = new Date(from + days * 86400000).toISOString();
    const at = new Date(now).toISOString();
    const str = (s) => ({ stringValue: String(s || '').slice(0, 200) });
    const body = { writes: [
      // the invoice is recorded once: a second callback / webhook for it fails here and changes nothing
      { update: { name: paymentPath, fields: { uid: str(uid), email: str(meta.email), amount: { doubleValue: amount }, days: { integerValue: String(days) }, at: { timestampValue: at }, method: str(v.payment_method), transactionId: str(v.transaction_id) } }, currentDocument: { exists: false } },
      { update: { name: subPath, fields: { plan: str('paid'), paidUntil: { timestampValue: until }, lastPaymentAt: { timestampValue: at }, lastPaymentId: str(invoiceId), email: str(meta.email), name: str(meta.name) } },
        updateMask: { fieldPaths: ['plan', 'paidUntil', 'lastPaymentAt', 'lastPaymentId', 'email', 'name'] },
        currentDocument: sub ? { updateTime: sub.updateTime } : { exists: false } },
    ] };
    const c = await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (c.ok) {
      await syncShops(token, uid, until);
      return { ok: true, uid, paidUntil: until };
    }
    if (c.status !== 400 && c.status !== 409) throw new Error('Could not save the plan.');
    // FAILED_PRECONDITION / ABORTED: already recorded, or the plan changed meanwhile -> look again
  }
  return { ok: false, reason: 'busy, try again' };
}
