// /api/plan?action=reminders (see api/plan.js), meant to run once a day (Vercel Cron): emails shop owners whose paid plan ends within
// reminderDays (settings/plans), and once more when it has ended, with a "Renew" link. Each email is sent once per
// plan end date (remindedBefore / remindedExpired on subscriptions/{uid}).
//
// Environment variables: CRON_SECRET (Vercel sends it as "Authorization: Bearer <CRON_SECRET>" to cron jobs),
// RESEND_API_KEY + MAIL_FROM (email), FIREBASE_SERVICE_ACCOUNT
import { PROJECT, SITE, FS, accessToken, val } from '../_sslc.js';
import { emailOwners } from '../_owners.js';
import { readPlans } from '../_plans.js';
import { toMillis, planPrice } from '../../src/data/priceCheck.js';

export const config = { maxDuration: 60 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = 86400000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET is not set.' });
  if ((req.headers.authorization || '') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Not allowed.' });
  try {
    const token = await accessToken();
    const plans = await readPlans(token);
    if (!plans.enabled) return res.status(200).json({ sent: 0, reason: 'plans off' });
    const now = Date.now();
    let sent = 0;
    let pageToken = '';
    do {
      const r = await fetch(`${FS}/documents/subscriptions?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) break;
      const j = await r.json();
      for (const d of j.documents || []) {
        const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
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
    return res.status(200).json({ sent });
  } catch (e) {
    console.error('plan-reminders', e);
    return res.status(500).json({ error: e.message || 'failed' });
  }
}
