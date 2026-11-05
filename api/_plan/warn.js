// /api/plan?action=warn (see api/plan.js): the Owner warns a seller about one shop before removing it. The note is saved
// on the shop (shops/{slug}.warning, shown on the seller's My Shop) and emailed to the seller. Only the Owner can call it
// (checked by reading sellers/ with the caller's own login, which the rules allow only for the Owner).
import { PROJECT, SITE, FS, accessToken, val } from '../_sslc.js';
import { emailOwners } from '../_owners.js';

export const config = { maxDuration: 20 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fieldsOf = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));

export default async function warn(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const auth = req.headers.authorization || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'Please sign in.' });
    const probe = await fetch(`${FS}/documents/sellers?pageSize=1`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!probe.ok) return res.status(403).json({ error: 'Only the Owner can do this.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const slug = String(body.slug || '');
    const note = String(body.note || '').trim().slice(0, 300);
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) return res.status(400).json({ error: 'Bad shop.' });
    if (note.length < 3) return res.status(400).json({ error: 'Write a short note for the seller.' });

    const token = await accessToken();
    const sr = await fetch(`${FS}/documents/shops/${slug}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!sr.ok) return res.status(404).json({ error: 'Shop not found.' });
    const shop = fieldsOf(await sr.json());
    const at = new Date().toISOString();
    const w = await fetch(`${FS}/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{
        update: { name: `projects/${PROJECT}/databases/(default)/documents/shops/${slug}`, fields: { warning: { mapValue: { fields: { note: { stringValue: note }, at: { stringValue: at } } } } } },
        updateMask: { fieldPaths: ['warning'] },
        currentDocument: { exists: true },
      }] }),
    });
    if (!w.ok) return res.status(502).json({ error: 'Could not save the warning.' });

    // email the seller (their address is private: sellers/{uid}, read here with the server account)
    let emailed = false;
    if (shop.ownerUid) {
      const pr = await fetch(`${FS}/documents/sellers/${shop.ownerUid}`, { headers: { Authorization: `Bearer ${token}` } });
      const seller = pr.ok ? fieldsOf(await pr.json()) : {};
      const email = String(seller.email || '').toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const shopName = String(shop.name || slug).slice(0, 60);
        const subject = `Warning about your Kyvro shop: ${shopName}`;
        const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:560px;margin:0 auto;padding:24px;line-height:1.7">
          <p>Kyvro sent a warning about your shop <strong>${esc(shopName)}</strong>:</p>
          <p style="padding:12px;border-left:4px solid #D4AF37;background:#faf7ef">${esc(note)}</p>
          <p>Please fix it soon, otherwise the shop may be removed. Open Sell on Kyvro to see it: <a href="${esc(SITE)}">${esc(SITE)}</a></p></div></body></html>`;
        emailed = await emailOwners([email], subject, html, `Kyvro sent a warning about your shop ${shopName}:\n${note}\n\nPlease fix it soon, otherwise the shop may be removed.\n${SITE}`);
      }
    }
    return res.status(200).json({ ok: true, at, emailed });
  } catch (e) {
    console.error('plan warn', e);
    return res.status(500).json({ error: 'Could not send the warning.' });
  }
}
