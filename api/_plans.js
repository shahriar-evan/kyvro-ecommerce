// Shared helpers for the shop plan (subscription) payment. Files starting with "_" are not public endpoints.
//
// The price ALWAYS comes from settings/plans on the server, never from the browser. subscriptions/{uid} is written only
// here (service account, api/plan.js), and every UddoktaPay invoice can extend a plan only once (subscriptionPayments/{invoiceId}).
//
// UddoktaPay has no recurring / automatic charge API (only create charge, verify, webhook, refund), so a plan is renewed
// by hand: the shop owner presses "Renew" and pays again. Each payment adds periodDays.

import { PROJECT, FS, accessToken, val } from './_sslc.js';
import { UDDOKTA_BASE, UDDOKTA_KEY } from './_uddokta.js';
import { ownerEmails } from './_owners.js';
import { normalizePlans, planPrice, toMillis, effectiveTier } from '../src/data/priceCheck.js';

const DOCS = `projects/${PROJECT}/databases/(default)/documents`;
const fields = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));

export async function readDoc(token, path) {
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

// Who is calling: their Firebase login token must be accepted by Firestore (reading their own team / seller entry
// proves it), and they must be an active Manager or Admin, or a public seller (the Owner has no plan).
// Returns { uid, email, name, seller?, slug? } or { error, status }.
export async function planCaller(req) {
  const auth = req.headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let claims = {};
  try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')); } catch (e) { /* bad token */ }
  const email = String(claims.email || '').toLowerCase();
  const uid = String(claims.sub || claims.user_id || '');
  if (!email || !uid) return { error: 'Please sign in.', status: 401 };
  const r = await fetch(`${FS}/documents/admins/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (r.status === 404) {
    // not on the team: a public seller has their own sellers/{uid} entry (readable only with their own login)
    const sr = await fetch(`${FS}/documents/sellers/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!sr.ok) return { error: 'Open your shop first (Sell on Kyvro).', status: 403 };
    const sd = fields(await sr.json());
    // a seller's shop waits for the Owner first (no status = from before approvals = approved)
    if ((sd.status || 'approved') !== 'approved') return { error: 'Your shop is waiting for approval.', status: 403 };
    // every shop of the seller (more than one on Pro / Premium); the first is the application's shop
    const slug = String(sd.slug || '');
    const shops = (Array.isArray(sd.shops) && sd.shops.length ? sd.shops : [slug]).map(String).filter((x) => /^[a-z0-9-]{3,40}$/.test(x)).slice(0, 10);
    return { uid, email, name: String(sd.name || ''), seller: true, slug, shops };
  }
  if (!r.ok) return { error: 'Please sign in again.', status: 401 };
  const me = fields(await r.json());
  if (me.active === false || !['manager', 'admin'].includes(me.role || 'admin')) return { error: 'Only Managers and Admins buy a plan.', status: 403 };
  return { uid, email, name: String(me.name || '') };
}

// The Owner looking at one seller's dashboard (Sellers > View dashboard, read-only). No impersonation: the Owner's own
// login token must be able to read sellers/{uid} (firestore.rules: only that seller or the Owner), and the email must be
// an Owner. Returns the SELLER as { uid, email, name, seller, slug, shops, viewer } or { error, status }.
export async function ownerViewer(req, targetUid) {
  const uid = String(targetUid || '');
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return { error: 'Bad seller id.', status: 400 };
  const auth = req.headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let claims = {};
  try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')); } catch (e) { /* bad token */ }
  const email = String(claims.email || '').toLowerCase();
  const me = String(claims.sub || claims.user_id || '');
  if (!email || !me) return { error: 'Please sign in.', status: 401 };
  if (me === uid) return { error: 'Use your own dashboard.', status: 400 };
  const sr = await fetch(`${FS}/documents/sellers/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (sr.status === 404) return { error: 'No such seller.', status: 404 };
  if (!sr.ok) return { error: 'Only the Owner can view a seller.', status: 403 };
  const owners = await ownerEmails(await accessToken());
  if (!owners.has(email)) return { error: 'Only the Owner can view a seller.', status: 403 };
  const sd = fields(await sr.json());
  const slug = String(sd.slug || '');
  const shops = (Array.isArray(sd.shops) && sd.shops.length ? sd.shops : [slug]).map(String).filter((x) => /^[a-z0-9-]{3,40}$/.test(x)).slice(0, 10);
  return { uid, email: String(sd.email || ''), name: String(sd.name || ''), seller: true, slug, shops, viewer: email };
}

// The caller's current plan (subscriptions/{uid}) as { tier: 'free'|'pro'|'premium', paidUntil }
export async function currentPlan(token, uid) {
  const d = await readDoc(token, `subscriptions/${uid}`);
  const data = (d && d.data) || {};
  return { tier: effectiveTier(data), paidUntil: data.paidUntil || null };
}

// Copies the plan end date and tier onto the person's shops (the storefront reads them there; subscriptions are private)
export async function syncShops(token, uid, paidUntilIso, tier = 'pro') {
  const r = await fetch(`${FS}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'shops' }], where: { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: uid } } } } }),
  });
  if (!r.ok) return 0;
  const rows = (await r.json()).filter((x) => x.document);
  if (!rows.length) return 0;
  const writes = rows.map((x) => ({
    update: { name: x.document.name, fields: { paidUntil: { timestampValue: paidUntilIso }, tier: { stringValue: tier === 'premium' ? 'premium' : 'pro' } } },
    updateMask: { fieldPaths: ['paidUntil', 'tier'] },
    currentDocument: { exists: true },
  }));
  await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  return rows.length;
}

// Copies the paid Basic end date onto the seller's shops (basicDue() in src/data/priceCheck.js reads it there)
export async function syncBasic(token, uid, basicUntilIso) {
  const r = await fetch(`${FS}/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'shops' }], where: { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: uid } } } } }),
  });
  if (!r.ok) return 0;
  const rows = (await r.json()).filter((x) => x.document);
  if (!rows.length) return 0;
  const writes = rows.map((x) => ({
    update: { name: x.document.name, fields: { basicUntil: { timestampValue: basicUntilIso } } },
    updateMask: { fieldPaths: ['basicUntil'] },
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
    const str0 = (s) => ({ stringValue: String(s || '').slice(0, 200) });
    if (meta.tier === 'basic') {
      // Basic: basicUntil = max(now, current basicUntil) + days. Pro / Premium (tier, paidUntil) are not touched.
      const bFrom = Math.max(now, toMillis(sub && sub.data.basicUntil));
      const bUntil = new Date(bFrom + days * 86400000).toISOString();
      const bAt = new Date(now).toISOString();
      const bBody = { writes: [
        { update: { name: paymentPath, fields: { uid: str0(uid), email: str0(meta.email), tier: str0('basic'), amount: { doubleValue: amount }, days: { integerValue: String(days) }, at: { timestampValue: bAt }, method: str0(v.payment_method), transactionId: str0(v.transaction_id) } }, currentDocument: { exists: false } },
        { update: { name: subPath, fields: { basicUntil: { timestampValue: bUntil }, lastPaymentAt: { timestampValue: bAt }, lastPaymentId: str0(invoiceId), email: str0(meta.email), name: str0(meta.name) } },
          updateMask: { fieldPaths: ['basicUntil', 'lastPaymentAt', 'lastPaymentId', 'email', 'name'] },
          currentDocument: sub ? { updateTime: sub.updateTime } : { exists: false } },
      ] };
      const bc = await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bBody) });
      if (bc.ok) {
        await syncBasic(token, uid, bUntil);
        return { ok: true, uid, basicUntil: bUntil, tier: 'basic' };
      }
      if (bc.status !== 400 && bc.status !== 409) throw new Error('Could not save the plan.');
      continue;
    }
    // the tier bought; a running Premium stays Premium (no downgrade by a late Pro payment)
    const bought = meta.tier === 'premium' ? 'premium' : 'pro';
    const tier = sub && effectiveTier(sub.data, now) === 'premium' ? 'premium' : bought;
    const from = Math.max(now, toMillis(sub && sub.data.paidUntil));
    const until = new Date(from + days * 86400000).toISOString();
    const at = new Date(now).toISOString();
    const str = (s) => ({ stringValue: String(s || '').slice(0, 200) });
    const body = { writes: [
      // the invoice is recorded once: a second callback / webhook for it fails here and changes nothing
      { update: { name: paymentPath, fields: { uid: str(uid), email: str(meta.email), tier: str(bought), amount: { doubleValue: amount }, days: { integerValue: String(days) }, at: { timestampValue: at }, method: str(v.payment_method), transactionId: str(v.transaction_id) } }, currentDocument: { exists: false } },
      { update: { name: subPath, fields: { plan: str('paid'), tier: str(tier), paidUntil: { timestampValue: until }, lastPaymentAt: { timestampValue: at }, lastPaymentId: str(invoiceId), email: str(meta.email), name: str(meta.name) } },
        updateMask: { fieldPaths: ['plan', 'tier', 'paidUntil', 'lastPaymentAt', 'lastPaymentId', 'email', 'name'] },
        currentDocument: sub ? { updateTime: sub.updateTime } : { exists: false } },
    ] };
    const c = await fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (c.ok) {
      await syncShops(token, uid, until, tier);
      return { ok: true, uid, paidUntil: until, tier };
    }
    if (c.status !== 400 && c.status !== 409) throw new Error('Could not save the plan.');
    // FAILED_PRECONDITION / ABORTED: already recorded, or the plan changed meanwhile -> look again
  }
  return { ok: false, reason: 'busy, try again' };
}
