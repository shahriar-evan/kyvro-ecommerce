// Vercel serverless function: tells the Owner(s) that an Admin made their own shop and it waits for Accept / Reject
// (phone / browser notification + email). The shop itself is saved by the website, protected by Firestore rules.
//
// Safe to call without a login: the text always comes from the saved shop (never from the caller), it only
// notifies for a shop that really waits ('pending'), and only once per shop.
//
// Environment variables: FIREBASE_SERVICE_ACCOUNT, and for the email RESEND_API_KEY + MAIL_FROM (see api/_owners.js)

import { PROJECT, SITE, FS, accessToken, val } from './_sslc.js';
import { ownerEmails, pushToOwners, emailOwners } from './_owners.js';

export const config = { maxDuration: 20 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function readDoc(token, path) {
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const d = await r.json();
  return Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const slug = String(body.slug || '');
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) return res.status(400).json({ error: 'Bad shop.' });

    const token = await accessToken();
    const shop = await readDoc(token, `shops/${slug}`);
    if (!shop || shop.status !== 'pending') return res.status(200).json({ sent: 0, reason: 'no waiting request' });
    if (shop.notified) return res.status(200).json({ sent: 0, reason: 'already notified' });

    // remember that the Owner was notified (before sending, so a double click cannot notify twice)
    const mark = await fetch(`${FS}/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{
        update: { name: `projects/${PROJECT}/databases/(default)/documents/shops/${slug}`, fields: { notified: { booleanValue: true } } },
        updateMask: { fieldPaths: ['notified'] },
        currentDocument: { exists: true },
      }] }),
    });
    if (!mark.ok) return res.status(200).json({ sent: 0, reason: 'could not mark' });

    const who = (await readDoc(token, `shopOwners/${slug}`)) || {};
    const person = String(who.name || who.email || 'An Admin').slice(0, 80);
    const shopName = String(shop.name || slug).slice(0, 60);
    const owners = await ownerEmails(token);

    const title = `Shop request: ${shopName}`;
    const text = `${person} made a shop and waits for you to accept it (Admin Portal -> Team Shops).`;
    const pushed = await pushToOwners(token, owners, title, text);

    const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p><strong>${esc(person)}</strong>${who.email ? ` (${esc(who.email)})` : ''} made a new shop: <strong>${esc(shopName)}</strong>.</p>
    <p>It stays switched off until you accept it. Open the Admin Portal, go to <strong>Team Shops</strong> and press <strong>Accept</strong> or <strong>Reject</strong>.</p>
    <p><a href="${esc(SITE)}" style="display:inline-block;background:#D4AF37;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Open Kyvro</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center">${esc(SITE.replace(/^https?:\/\//, ''))}</div>
</div></body></html>`;
    const plain = `${person}${who.email ? ` (${who.email})` : ''} made a new shop: ${shopName}.\n\nIt stays switched off until you accept it. Open the Admin Portal -> Team Shops and press Accept or Reject.\n\n${SITE}`;
    const emailed = await emailOwners(owners, title, html, plain);

    return res.status(200).json({ sent: pushed, emailed });
  } catch (err) {
    return res.status(200).json({ sent: 0, error: err.message || 'failed' });
  }
}
