// Vercel serverless function: emails a person who was just removed from the Admin team (Owner only).
// The email says they were removed and shows the optional note the Owner typed.
//
// Safe by design: the caller must be signed in as an Owner (checked with their own login token against Firestore),
// and the address must really be gone from the "admins" list already (so it cannot be used to mail random people).
//
// Environment variables (already used by send-offer): RESEND_API_KEY, MAIL_FROM, FIREBASE_SERVICE_ACCOUNT

import { FS, SITE, accessToken, val } from './_sslc.js';

export const config = { maxDuration: 20 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emailFromToken = (t) => {
  try { return String(JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')).email || '').toLowerCase(); } catch (e) { return ''; }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  try {
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(200).json({ sent: false, reason: 'email not set up' });
    const auth = req.headers.authorization || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const me = emailFromToken(idToken);
    if (!me) return res.status(401).json({ error: 'Please sign in.' });

    // the caller must be an Owner (Firestore checks the login token itself)
    const mine = await fetch(`${FS}/documents/admins/${encodeURIComponent(me)}`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!mine.ok) return res.status(403).json({ error: 'Only the Owner can do this.' });
    const mj = await mine.json();
    const role = val((mj.fields || {}).role);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the Owner can do this.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const to = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 80);
    const note = String(body.note || '').trim().slice(0, 1000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Bad email.' });

    // the person must already be removed
    const token = await accessToken();
    const still = await fetch(`${FS}/documents/admins/${encodeURIComponent(to)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (still.status !== 404) return res.status(400).json({ error: 'This person is still on the team.' });

    const hi = name ? `Hi ${name.split(' ')[0]},` : 'Hello,';
    const subject = 'Your Kyvro Admin Portal access was removed';
    const noteHtml = note ? `<div style="margin:18px 0;padding:14px 16px;background:#fafafa;border-left:3px solid #D4AF37;font-size:14px;line-height:1.6;white-space:pre-line"><strong>Note from the Owner:</strong><br>${esc(note)}</div>` : '';
    const html = `<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0b0b0b;padding:20px 24px;color:#D4AF37;font-size:20px;letter-spacing:3px;font-weight:bold">KYVRO</div>
  <div style="padding:24px;font-size:15px;line-height:1.7">
    <p>${esc(hi)}</p>
    <p>You have been removed from the Kyvro Admin team. You can no longer sign in to the Admin Portal with this email.</p>
    ${noteHtml}
    <p>If you think this was a mistake, please contact us at kyvrofashion@gmail.com.</p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center">${esc(SITE.replace(/^https?:\/\//, ''))}</div>
</div></body></html>`;
    const text = `${hi}\n\nYou have been removed from the Kyvro Admin team. You can no longer sign in to the Admin Portal with this email.\n${note ? `\nNote from the Owner:\n${note}\n` : ''}\nIf you think this was a mistake, contact kyvrofashion@gmail.com.`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
    });
    return res.status(200).json({ sent: r.ok });
  } catch (err) {
    return res.status(200).json({ sent: false, error: err.message || 'failed' });
  }
}
