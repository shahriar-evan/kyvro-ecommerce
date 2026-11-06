// Part of the daily job (/api/plan?action=reminders, api/_plan/reminders.js). Not a public endpoint.
//
// 1) Unpaid orders. An order is saved before the customer reaches the payment page, so some orders are never paid:
//    - Online Payment and not Paid, or
//    - Cash on Delivery with a delivery charge that had to be paid online first (advance) and was not.
//    While it is still Pending: a reminder on day 1 and day 3 (phone notification to the customer's devices + email),
//    and on day 7 it is cancelled (status Cancelled, a history line). Paid / confirmed / plain COD orders are never touched.
//    Stock is not affected (stock is taken when an order is confirmed). The stage is kept on the order (payRemind).
// 2) Carts left behind. A signed-in customer's cart summary is on users/{uid}.cart ({n, name, at, shop}, written by the
//    app). Day 1, 3 and 7 after the cart last changed: one phone notification each, then nothing until the cart changes
//    again. Only to customers who allowed notifications. The stage is kept in cartReminders/{uid} (server only).

import { SITE, FS, val } from '../_sslc.js';
import { emailOwners } from '../_owners.js';
import { toMillis } from '../../src/data/priceCheck.js';

const day = 86400000;
const PAY_DAYS = [1, 3];
const CANCEL_DAY = 7;
const CART_DAYS = [1, 3, 7];
// the delivery charge is paid online first only while online payment is on (VITE_ONLINE_PAY, the same switch as the app)
const ONLINE_ON = String(process.env.VITE_ONLINE_PAY || '') === 'on';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fieldsOf = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));
const commit = (token, writes) => fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
async function runQuery(token, structuredQuery) {
  const r = await fetch(`${FS}/documents:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery }) });
  return r.ok ? (await r.json()).filter((x) => x.document) : [];
}
const eq = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value } });

// what is still to pay on an order: { kind: 'full' | 'advance', amount } or null (nothing the customer must pay online)
export function unpaidPart(o) {
  if (!o || o.status !== 'Pending' || o.paymentStatus === 'Paid') return null;
  if (o.paymentMethod === 'Online Payment') return { kind: 'full', amount: Number(o.total) || 0 };
  if (o.paymentMethod === 'Cash on Delivery' && ONLINE_ON && (Number(o.shipping) || 0) > 0 && !(Number(o.advancePaid) > 0)) {
    return { kind: 'advance', amount: Number(o.shipping) || 0 };
  }
  return null; // Manual bKash / Nagad waits for the team, plain COD needs nothing now
}

// phone / browser notification to every device of one signed-in customer. Returns how many were sent.
async function pushToUid(token, project, uid, title, body, link) {
  if (!uid) return 0;
  const docs = await runQuery(token, { from: [{ collectionId: 'pushTokens' }], where: eq('uid', { stringValue: uid }), limit: 10 });
  let sent = 0;
  for (const d of docs) {
    const t = fieldsOf(d.document).token;
    if (!t) continue;
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: t, data: { title, body, link, icon: `${SITE}/kyvro-icon.png` }, webpush: { headers: { Urgency: 'normal', TTL: '86400' } } } }),
    });
    if (r.ok) sent += 1;
  }
  return sent;
}

function payEmail(orderNumber, part, link, last) {
  const what = part.kind === 'advance' ? 'delivery charge' : 'payment';
  const whatBn = part.kind === 'advance' ? 'ডেলিভারি চার্জ' : 'পেমেন্ট';
  const subject = `Payment pending for your Kyvro order ${orderNumber}`;
  const lineEn = `Your order ${orderNumber} is saved, but the ${what} of ৳${part.amount} is still due. ${last ? 'This is the last reminder: ' : ''}orders not paid within ${CANCEL_DAY} days are cancelled automatically.`;
  const lineBn = `আপনার অর্ডার ${orderNumber} সেভ করা আছে, কিন্তু ${whatBn} ৳${part.amount} এখনও বাকি। ${CANCEL_DAY} দিনের মধ্যে পেমেন্ট না হলে অর্ডারটি নিজে থেকে বাতিল হয়ে যাবে।`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p>${esc(lineBn)}</p><p>${esc(lineEn)}</p>
    <p><a href="${esc(link)}" style="display:inline-block;background:#D4AF37;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Pay now</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center">${esc(SITE.replace(/^https?:\/\//, ''))}</div>
</div></body></html>`;
  return { subject, html, text: `${lineBn}\n\n${lineEn}\n\nPay now: ${link}` };
}

export async function unpaidOrders(token, project, now) {
  const out = { reminded: 0, cancelled: 0 };
  const docs = await runQuery(token, { from: [{ collectionId: 'orders' }], where: eq('status', { stringValue: 'Pending' }), limit: 500 });
  for (const d of docs) {
    const o = fieldsOf(d.document);
    const part = unpaidPart(o);
    if (!part) continue;
    const created = toMillis(o.createdAt);
    if (!created) continue;
    const days = Math.floor((now - created) / day);
    const orderNumber = String(o.orderNumber || d.document.name.split('/').pop());
    const name = d.document.name;

    if (days >= CANCEL_DAY) {
      const r = await commit(token, [{
        update: { name, fields: { status: { stringValue: 'Cancelled' }, autoCancelledAt: { stringValue: new Date(now).toISOString() } } },
        updateMask: { fieldPaths: ['status', 'autoCancelledAt'] },
        // only if nothing changed since we read it (still Pending, still unpaid)
        currentDocument: { updateTime: d.document.updateTime },
        updateTransforms: [
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'history', appendMissingElements: { values: [{ mapValue: { fields: {
            status: { stringValue: `Auto-cancelled: not paid in ${CANCEL_DAY} days` },
            by: { stringValue: 'system' }, byName: { stringValue: 'Kyvro (automatic)' }, at: { stringValue: new Date(now).toISOString() },
          } } }] } },
        ],
      }]);
      if (r.ok) out.cancelled += 1;
      continue;
    }

    const stage = Number(o.payRemind) || 0;
    const step = PAY_DAYS.filter((x) => x <= days).pop() || 0;
    if (step <= stage) continue;
    const link = `${SITE}/?pay=due&order=${encodeURIComponent(orderNumber)}&kind=${part.kind}&amt=${Math.round(part.amount)}`;
    const title = part.kind === 'advance' ? 'ডেলিভারি চার্জ বাকি · Delivery charge due' : 'পেমেন্ট বাকি · Payment due';
    const body = `অর্ডার ${orderNumber}: ৳${Math.round(part.amount)} বাকি। ${CANCEL_DAY} দিনের মধ্যে পেমেন্ট না হলে অর্ডার বাতিল হবে। Tap to pay.`;
    let sent = await pushToUid(token, project, String(o.uid || ''), title, body, link);
    const email = String(o.email || (o.customer && o.customer.email) || '').toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const m = payEmail(orderNumber, part, link, step === PAY_DAYS[PAY_DAYS.length - 1]);
      if (await emailOwners(new Set([email]), m.subject, m.html, m.text)) sent += 1;
    }
    // the stage is saved even when nobody could be reached, so the job does not try again every day
    await commit(token, [{ update: { name, fields: { payRemind: { integerValue: String(step) } } }, updateMask: { fieldPaths: ['payRemind'] }, currentDocument: { exists: true } }]);
    if (sent) out.reminded += 1;
  }
  return out;
}

export async function cartReminders(token, project, now, docPath) {
  const out = { carts: 0 };
  const users = await runQuery(token, { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: 'cart.n' }, op: 'GREATER_THAN', value: { integerValue: '0' } } }, limit: 1000 });
  for (const u of users) {
    const uid = u.document.name.split('/').pop();
    const f = fieldsOf(u.document);
    const cart = f.cart || {};
    const at = String(cart.at || '');
    const since = toMillis(at);
    if (!since) continue;
    const days = Math.floor((now - since) / day);
    const step = CART_DAYS.filter((x) => x <= days).pop() || 0;
    if (!step) continue;
    const r = await fetch(`${FS}/documents/cartReminders/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
    const prev = r.ok ? fieldsOf(await r.json()) : {};
    const stage = prev.at === at ? Number(prev.stage) || 0 : 0; // a changed cart starts again
    if (step <= stage) continue;
    const n = Number(cart.n) || 1;
    const item = String(cart.name || '').slice(0, 60);
    const shop = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(String(cart.shop || '')) ? String(cart.shop) : '';
    const link = `${SITE}/${shop}?cart=open`;
    const title = step === CART_DAYS[CART_DAYS.length - 1] ? 'আপনার কার্ট এখনও অপেক্ষা করছে 🛒' : 'আপনার কার্টে পণ্য রয়ে গেছে 🛒';
    const body = `${item ? `${item}${n > 1 ? ` + আরও ${n - 1}টি` : ''}` : `${n}টি পণ্য`} আপনার কার্টে আছে। স্টক শেষ হওয়ার আগে অর্ডার করুন। Your cart is waiting.`;
    const sent = await pushToUid(token, project, uid, title, body, link);
    await commit(token, [{ update: { name: docPath(`cartReminders/${uid}`), fields: { at: { stringValue: at }, stage: { integerValue: String(step) } } } }]);
    if (sent) out.carts += 1;
  }
  return out;
}
