// Vercel serverless function: tells the Owner(s) that an Admin made their own shop and it waits for Accept / Reject,
// or (?action=seller) that a customer applied to sell on Kyvro
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

// ?action=seller: a customer applied to sell on Kyvro (sellers/{uid} status 'pending'). Same safety: the text comes
// from the saved application, only for a waiting one, once per application (notified is cleared when they apply again).
async function sellerApplied(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const uid = String(body.uid || '');
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return res.status(400).json({ error: 'Bad seller.' });
  const token = await accessToken();
  const app = await readDoc(token, `sellers/${uid}`);
  if (!app || app.status !== 'pending') return res.status(200).json({ sent: 0, reason: 'no waiting application' });
  if (app.notified) return res.status(200).json({ sent: 0, reason: 'already notified' });
  const mark = await fetch(`${FS}/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{
      update: { name: `projects/${PROJECT}/databases/(default)/documents/sellers/${uid}`, fields: { notified: { booleanValue: true } } },
      updateMask: { fieldPaths: ['notified'] },
      currentDocument: { exists: true },
    }] }),
  });
  if (!mark.ok) return res.status(200).json({ sent: 0, reason: 'could not mark' });
  const shop = (await readDoc(token, `shops/${app.slug}`)) || {};
  const owners = await ownerEmails(token);
  const shopName = String(shop.name || app.slug || '').slice(0, 60);
  const person = String(app.name || app.email || 'Someone').slice(0, 80);
  const title = `Seller application: ${shopName}`;
  const text = `${person} wants to sell on Kyvro (${String(app.district || '')}). Admin Portal -> Sellers -> Pending applications.`;
  const pushed = await pushToOwners(token, owners, title, text);
  const row = (k, v) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#888">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : '');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p>A new seller applied: <strong>${esc(shopName)}</strong>. The shop stays off until you approve it.</p>
    <table style="font-size:14px">${row('Name', app.name)}${row('Email', app.email)}${row('WhatsApp', app.whatsapp)}${row('District', app.district)}${row('Area', app.area)}${row('Page', app.pageLink)}${row('Categories', Array.isArray(app.categories) ? app.categories.join(', ') : '')}${row('Note', app.productNote)}</table>
    <p>Open the Admin Portal, go to <strong>Sellers</strong> and press <strong>Approve</strong> or <strong>Reject</strong>.</p>
    <p><a href="${esc(SITE)}" style="display:inline-block;background:#D4AF37;color:#000;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:4px">Open Kyvro</a></p>
  </div>
</div></body></html>`;
  const plain = `A new seller applied: ${shopName}\nName: ${app.name || ''}\nEmail: ${app.email || ''}\nWhatsApp: ${app.whatsapp || ''}\nDistrict: ${app.district || ''}, ${app.area || ''}\nPage: ${app.pageLink || ''}\nCategories: ${Array.isArray(app.categories) ? app.categories.join(', ') : ''}\nNote: ${app.productNote || ''}\n\nAdmin Portal -> Sellers -> Approve / Reject.\n${SITE}`;
  const emailed = await emailOwners(owners, title, html, plain);
  return res.status(200).json({ sent: pushed, emailed });
}

// ?action=logo: a shop uploaded a logo that waits for approval. Once per upload (logoNotifiedAt = logoPendingAt).
async function logoPending(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const slug = String(body.slug || '');
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return res.status(400).json({ error: 'Bad shop.' });
  const token = await accessToken();
  const shop = await readDoc(token, `shops/${slug}`);
  if (!shop || !shop.logoPending || !shop.logoPendingAt) return res.status(200).json({ sent: 0, reason: 'no waiting logo' });
  if (shop.logoNotifiedAt === shop.logoPendingAt) return res.status(200).json({ sent: 0, reason: 'already notified' });
  const mark = await fetch(`${FS}/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{
      update: { name: `projects/${PROJECT}/databases/(default)/documents/shops/${slug}`, fields: { logoNotifiedAt: { stringValue: String(shop.logoPendingAt) } } },
      updateMask: { fieldPaths: ['logoNotifiedAt'] },
      currentDocument: { exists: true },
    }] }),
  });
  if (!mark.ok) return res.status(200).json({ sent: 0, reason: 'could not mark' });
  const owners = await ownerEmails(token);
  const shopName = String(shop.name || slug).slice(0, 60);
  const title = `Logo to approve: ${shopName}`;
  const text = `${shopName} uploaded a logo. Admin Portal -> Plan Members -> Approve or Reject.`;
  const pushed = await pushToOwners(token, owners, title, text);
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:560px;margin:0 auto;padding:24px;line-height:1.7">
    <p><strong>${esc(shopName)}</strong> uploaded a new logo. It stays hidden until you approve it.</p>
    <p>Admin Portal &rarr; <strong>Plan Members</strong> &rarr; Approve or Reject.</p><p><a href="${esc(SITE)}">${esc(SITE)}</a></p></div></body></html>`;
  const emailed = await emailOwners(owners, title, html, `${text}\n${SITE}`);
  return res.status(200).json({ sent: pushed, emailed });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (String((req.query && req.query.action) || '') === 'logo') {
    try { return await logoPending(req, res); } catch (err) { return res.status(200).json({ sent: 0, error: err.message || 'failed' }); }
  }
  if (String((req.query && req.query.action) || '') === 'seller') {
    try { return await sellerApplied(req, res); } catch (err) { return res.status(200).json({ sent: 0, error: err.message || 'failed' }); }
  }
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
