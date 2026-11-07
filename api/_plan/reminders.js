// /api/plan?action=reminders (see api/plan.js), meant to run once a day (Vercel Cron): emails shop owners whose paid plan ends within
// reminderDays (settings/plans), and once more when it has ended, with a "Renew" link. Each email is sent once per
// plan end date (remindedBefore / remindedExpired on subscriptions/{uid}). The same for a paid Basic (basicUntil;
// remindedBasicBefore / remindedBasicExpired), only while Basic is charged and no Pro / Premium runs.
// Customers (api/_plan/nudges.js): unpaid orders get reminders on day 1 / 3 and are cancelled on day 7; carts left behind
// get a phone notification on day 1 / 3 / 7.
// It also looks after sellers who stopped signing in (sellers/{uid}.lastSeenAt, else createdAt):
//   - warning emails to the seller after 7, 15 and 25 days without a visit (each once per absence);
//   - removal only for a Free seller (no paid plan running) with NO open orders and NOTHING due: after 30 days, or
//     60 days if the account had a paid plan before. Shops, links and the seller entry are removed.
//   - open orders or money due: the shops are hidden (not removed) and the Owner gets a notification; the Owner makes
//     them live again (Sellers tab) once the orders are delivered / cancelled and the due is paid.

import { PROJECT, SITE, FS, accessToken, val } from '../_sslc.js';
import { emailOwners, ownerEmails, pushToOwners } from '../_owners.js';
import { readPlans } from '../_plans.js';
import { unpaidOrders, cartReminders } from './nudges.js';
import { purgeOldRemovedShops } from './removeshop.js';
import { toMillis, planPrice, basicPrice, basicCharging, orderMarkup } from '../../src/data/priceCheck.js';

export const config = { maxDuration: 60 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = 86400000;

const WARN_DAYS = [7, 15, 25];
const fieldsOf = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));
const docPath = (p) => `projects/${PROJECT}/databases/(default)/documents/${p}`;
async function runQuery(token, structuredQuery) {
  const r = await fetch(`${FS}/documents:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery }) });
  return r.ok ? (await r.json()).filter((x) => x.document) : null;
}
const commit = (token, writes) => fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
const setFields = (path, fields) => ({ update: { name: docPath(path), fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { exists: true } });
async function readFields(token, path) {
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.ok ? fieldsOf(await r.json()) : null;
}
function warnEmail(shopName, days, removeIn) {
  const final = days >= 25;
  const subject = final ? `Final warning: your Kyvro shop ${shopName} will be removed` : `Your Kyvro shop ${shopName} misses you`;
  const lead = `You have not signed in to Kyvro for ${days} days.`;
  const tail = removeIn > 0 ? ` If you do not sign in, your shop is removed in about ${removeIn} days (only if it has no open orders and nothing is due).` : '';
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:560px;margin:0 auto;padding:24px;line-height:1.7">
    <p>${esc(lead)}${esc(tail)}</p><p>Just sign in once to keep your shop: <a href="${esc(SITE)}">${esc(SITE)}</a></p></div></body></html>`;
  return { subject, html, text: `${lead}${tail}\nSign in once to keep your shop: ${SITE}` };
}
async function cleanupInactiveSellers(token, now) {
  const out = { warned: 0, removed: 0, hidden: 0 };
  let owners = null;
  let pageToken = '';
  do {
    const r = await fetch(`${FS}/documents/sellers?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) break;
    const j = await r.json();
    for (const d of j.documents || []) {
      const uid = d.name.split('/').pop();
      const f = fieldsOf(d);
      if ((f.status || 'approved') !== 'approved') continue;
      const last = toMillis(f.lastSeenAt) || toMillis(f.createdAt);
      if (!last) continue;
      const days = Math.floor((now - last) / day);
      if (days < WARN_DAYS[0]) continue;
      const email = String(f.email || '').toLowerCase();
      const shops = (Array.isArray(f.shops) && f.shops.length ? f.shops : [f.slug]).map(String).filter((x) => /^[a-z0-9-]{3,40}$/.test(x)).slice(0, 10);
      // plan: running now = never removed; paid before = 60 days; never paid = 30 days
      const sub = (await readFields(token, `subscriptions/${uid}`)) || {};
      const paidUntil = toMillis(sub.paidUntil);
      const limit = paidUntil > now ? Infinity : paidUntil ? 60 : 30;
      const first = shops[0] ? await readFields(token, `shops/${shops[0]}`) : null;
      const shopName = String((first && first.name) || shops[0] || 'your shop').slice(0, 60);

      // warning emails (each step once per absence; reset when the seller signs in again)
      const base = String(last);
      const sent = f.inactiveWarnBase === base ? Number(f.inactiveWarnStage) || 0 : 0;
      const step = WARN_DAYS.filter((x) => x <= days).pop() || 0;
      if (step > sent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const m = warnEmail(shopName, days, limit === Infinity ? 0 : limit - days);
        if (await emailOwners([email], m.subject, m.html, m.text)) out.warned += 1;
        await commit(token, [setFields(`sellers/${uid}`, { inactiveWarnStage: { integerValue: String(step) }, inactiveWarnBase: { stringValue: base } })]);
      }
      if (days < limit) continue;

      // removal day: open orders or money due -> hide and tell the Owner; else remove
      const orders = shops.length ? await runQuery(token, { from: [{ collectionId: 'orders' }], where: { fieldFilter: { field: { fieldPath: 'shop' }, op: 'IN', value: { arrayValue: { values: shops.map((x) => ({ stringValue: x })) } } } } }) : [];
      if (orders === null) continue;
      let open = 0; let earned = 0;
      for (const o of orders) {
        const of = fieldsOf(o.document);
        const st = String(of.status || '');
        if (!['Delivered', 'Cancelled'].includes(st)) open += 1;
        if (st === 'Delivered' && !of.returned) earned += orderMarkup(of);
      }
      let paid = 0;
      if (email) {
        const pays = await runQuery(token, { from: [{ collectionId: 'payouts' }], where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } } });
        for (const p of pays || []) paid += Number(fieldsOf(p.document).amount) || 0;
      }
      const due = Math.round(earned - paid);
      if (open === 0 && due <= 0) {
        const writes = [];
        for (const slug of shops) {
          const handles = await runQuery(token, { from: [{ collectionId: 'shopHandles' }], where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: slug } } } });
          for (const h of handles || []) writes.push({ delete: h.document.name });
          writes.push({ delete: docPath(`shops/${slug}`) });
        }
        writes.push({ delete: docPath(`sellerPayout/${uid}`) });
        writes.push({ delete: docPath(`sellers/${uid}`) });
        if ((await commit(token, writes)).ok) out.removed += 1;
        continue;
      }
      if (f.inactiveHoldAt === base) continue; // already hidden and the Owner told, for this absence
      const writes = shops.map((slug) => setFields(`shops/${slug}`, { active: { booleanValue: false }, inactiveHold: { booleanValue: true } }));
      writes.push(setFields(`sellers/${uid}`, { inactiveHoldAt: { stringValue: base } }));
      if (!(await commit(token, writes)).ok) continue;
      out.hidden += 1;
      if (!owners) owners = await ownerEmails(token);
      const title = `Inactive seller shop hidden: ${shopName}`;
      const text = `${f.name || email || 'A seller'} has not signed in for ${days} days. ${open} open order(s), due ${due} BDT. The shop is hidden until you clear them (Admin Portal -> Sellers -> Make live).`;
      await pushToOwners(token, owners, title, text);
      await emailOwners(owners, title, `<p>${esc(text)}</p><p><a href="${esc(SITE)}">${esc(SITE)}</a></p>`, `${text}\n${SITE}`);
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

// one email before / after a paid Basic period ends (Basic only, never while Pro / Premium runs)
async function basicReminder(token, d, f, plans, now) {
  const until = toMillis(f.basicUntil);
  const email = String(f.email || '').toLowerCase();
  if (!until || !basicCharging(plans) || toMillis(f.paidUntil) > now || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const left = until - now;
  let kind = '';
  if (left > 0 && left <= plans.reminderDays * day && f.remindedBasicBefore !== f.basicUntil) kind = 'before';
  else if (left <= 0 && left > -7 * day && f.remindedBasicExpired !== f.basicUntil) kind = 'expired';
  if (!kind) return false;
  const date = new Date(until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
  const price = basicPrice(plans);
  const subject = kind === 'before' ? `Your Kyvro Basic plan ends on ${date}` : 'Your Kyvro Basic plan has ended';
  const line = kind === 'before'
    ? `Your Basic plan ends on <strong>${esc(date)}</strong>. After that your store is closed to customers until you renew.`
    : `Your Basic plan ended on <strong>${esc(date)}</strong>. Your store is closed to customers now. Nothing is deleted: renew and it opens again.`;
  const hi = f.name ? `Hi ${String(f.name).split(' ')[0]},` : 'Hello,';
  const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p>${esc(hi)}</p>
    <p>${line}</p>
    <p>Renew for <strong>৳${price}</strong> (${plans.periodDays} days): Seller dashboard &rarr; Subscription &rarr; <strong>Renew Basic</strong>.</p>
    <p><a href="${esc(SITE)}" style="display:inline-block;background:#D4AF37;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Renew my plan</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center">${esc(SITE.replace(/^https?:\/\//, ''))}</div>
</div></body></html>`;
  const text = `${hi}\n\n${line.replace(/<[^>]+>/g, '')}\n\nRenew for ৳${price} (${plans.periodDays} days): Seller dashboard -> Subscription -> Renew Basic.\n${SITE}`;
  if (!(await emailOwners(new Set([email]), subject, html, text))) return false;
  const field = kind === 'before' ? 'remindedBasicBefore' : 'remindedBasicExpired';
  await commit(token, [setFields(`subscriptions/${d.name.split('/').pop()}`, { [field]: { stringValue: String(f.basicUntil) } })]);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET is not set.' });
  if ((req.headers.authorization || '') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Not allowed.' });
  try {
    const token = await accessToken();
    const now = Date.now();
    let cleanup = { warned: 0, removed: 0, hidden: 0 };
    try { cleanup = await cleanupInactiveSellers(token, now); } catch (e) { console.error('seller cleanup', e); }
    // customers: unpaid orders (reminders, cancel after 7 days) and carts left behind (phone notifications)
    let unpaid = { reminded: 0, cancelled: 0 }; let carts = { carts: 0 };
    try { unpaid = await unpaidOrders(token, PROJECT, now); } catch (e) { console.error('unpaid orders', e); }
    try { carts = await cartReminders(token, PROJECT, now, docPath); } catch (e) { console.error('cart reminders', e); }
    // shops the Owner removed more than 30 days ago are deleted for good
    let purged = 0;
    try { purged = await purgeOldRemovedShops(token, now); } catch (e) { console.error('purge removed shops', e); }
    const plans = await readPlans(token);
    if (!plans.enabled) return res.status(200).json({ sent: 0, reason: 'plans off', cleanup, unpaid, carts, purged });
    let sent = 0;
    let pageToken = '';
    do {
      const r = await fetch(`${FS}/documents/subscriptions?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) break;
      const j = await r.json();
      for (const d of j.documents || []) {
        const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
        if (await basicReminder(token, d, f, plans, now)) sent += 1;
        const until = toMillis(f.paidUntil);
        const email = String(f.email || '').toLowerCase();
        if (!until || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
        const left = until - now;
        let kind = '';
        if (left > 0 && left <= plans.reminderDays * day && f.remindedBefore !== f.paidUntil) kind = 'before';
        else if (left <= 0 && left > -7 * day && f.remindedExpired !== f.paidUntil) kind = 'expired';
        if (!kind) continue;

        const date = new Date(until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
        const subject = kind === 'before' ? `Your Kyvro shop plan ends on ${date}` : 'Your Kyvro shop plan has ended';
        const line = kind === 'before'
          ? `Your paid shop plan ends on <strong>${esc(date)}</strong>. After that your shop shows only its ${plans.freeLimit} best-selling products until you renew.`
          : `Your paid shop plan ended on <strong>${esc(date)}</strong>. Your shop now shows only its ${plans.freeLimit} best-selling products. The others are hidden, not deleted: renew and they come back.`;
        const price = planPrice(plans, f.tier === 'premium' ? 'premium' : 'pro');
        const hi = f.name ? `Hi ${String(f.name).split(' ')[0]},` : 'Hello,';
        const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p>${esc(hi)}</p>
    <p>${line}</p>
    <p>Renew for <strong>৳${price}</strong> (${plans.periodDays} days): Admin Portal &rarr; My Shop &rarr; <strong>Renew</strong>.</p>
    <p><a href="${esc(SITE)}" style="display:inline-block;background:#D4AF37;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Renew my plan</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center">${esc(SITE.replace(/^https?:\/\//, ''))}</div>
</div></body></html>`;
        const text = `${hi}\n\n${line.replace(/<[^>]+>/g, '')}\n\nRenew for ৳${price} (${plans.periodDays} days): Admin Portal -> My Shop -> Renew.\n${SITE}`;
        if (!(await emailOwners(new Set([email]), subject, html, text))) continue;
        sent += 1;
        const field = kind === 'before' ? 'remindedBefore' : 'remindedExpired';
        await fetch(`${FS}/documents:commit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes: [{
            update: { name: `projects/${PROJECT}/databases/(default)/documents/subscriptions/${d.name.split('/').pop()}`, fields: { [field]: { stringValue: String(f.paidUntil) } } },
            updateMask: { fieldPaths: [field] },
            currentDocument: { exists: true },
          }] }),
        });
      }
      pageToken = j.nextPageToken || '';
    } while (pageToken);
    return res.status(200).json({ sent, cleanup, unpaid, carts, purged });
  } catch (e) {
    console.error('plan-reminders', e);
    return res.status(500).json({ error: e.message || 'failed' });
  }
}
