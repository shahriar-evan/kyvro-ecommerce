// /api/plan?action=remove-shop (see api/plan.js), Owner only:
//   { slug, note }            remove a shop: it is hidden at once (active false) and kept for 30 days in "Removed shops"
//                             (shops/{slug}.removed = { at, note }); the shop's owner gets the reason by email and can ask
//                             Kyvro (WhatsApp) to bring it back
//   { slug, restore: true }   bring it back (removed cleared, shop live again)
//   { slug, purge: true }     delete it now for good (also done by the daily job 30 days after removal: purgeShop)
// Orders always stay. The Owner is checked like the other Owner actions (the caller's own login must read sellers/).
import { PROJECT, SITE, FS, accessToken, val } from '../_sslc.js';
import { emailOwners } from '../_owners.js';

export const config = { maxDuration: 30 };
export const KEEP_DAYS = 30;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fieldsOf = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));
const docName = (p) => `projects/${PROJECT}/databases/(default)/documents/${p}`;
const commit = (token, writes) => fetch(`${FS}/documents:commit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
async function read(token, path) {
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.ok ? fieldsOf(await r.json()) : null;
}
async function query(token, col, field, value) {
  const r = await fetch(`${FS}/documents:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) });
  return r.ok ? (await r.json()).filter((x) => x.document).map((x) => x.document) : [];
}
// the email address of a shop's owner (seller: sellers/{uid}; team: shopOwners/{slug})
async function ownerEmail(token, slug, shop) {
  const o = shop.kind === 'seller' ? await read(token, `sellers/${shop.ownerUid}`) : await read(token, `shopOwners/${slug}`);
  const e = String((o && o.email) || '').toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

// delete a shop for good: its links (handles + old aliases), shopOwners, and the seller's list entry (the seller entry
// and payout details go too when it was their last shop; their main shop moves to the next one otherwise)
export async function purgeShop(token, slug) {
  const shop = await read(token, `shops/${slug}`);
  if (!shop) return false;
  const writes = [];
  for (const h of await query(token, 'shopHandles', 'slug', slug)) writes.push({ delete: h.name });
  writes.push({ delete: docName(`shops/${slug}`) });
  if (shop.kind === 'seller' && shop.ownerUid) {
    const seller = await read(token, `sellers/${shop.ownerUid}`);
    if (seller) {
      const list = (Array.isArray(seller.shops) && seller.shops.length ? seller.shops : [seller.slug]).filter((x) => x && x !== slug);
      if (!list.length) {
        writes.push({ delete: docName(`sellers/${shop.ownerUid}`) });
        writes.push({ delete: docName(`sellerPayout/${shop.ownerUid}`) });
      } else {
        const fields = { shops: { arrayValue: { values: list.map((x) => ({ stringValue: x })) } } };
        if (seller.slug === slug) fields.slug = { stringValue: list[0] };
        writes.push({ update: { name: docName(`sellers/${shop.ownerUid}`), fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { exists: true } });
      }
    }
  } else {
    writes.push({ delete: docName(`shopOwners/${slug}`) });
  }
  return (await commit(token, writes)).ok;
}

// daily job: delete the shops removed more than KEEP_DAYS ago
export async function purgeOldRemovedShops(token, now = Date.now()) {
  let purged = 0;
  const r = await fetch(`${FS}/documents:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'shops' }], where: { fieldFilter: { field: { fieldPath: 'removed.at' }, op: 'LESS_THAN', value: { stringValue: new Date(now - KEEP_DAYS * 86400000).toISOString() } } } } }) });
  const rows = r.ok ? (await r.json()).filter((x) => x.document) : [];
  for (const x of rows) if (await purgeShop(token, x.document.name.split('/').pop())) purged += 1;
  return purged;
}

export default async function removeShop(req, res) {
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
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) return res.status(400).json({ error: 'Bad shop.' });
    const token = await accessToken();
    const shop = await read(token, `shops/${slug}`);
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });

    if (body.purge) return res.status(200).json({ ok: await purgeShop(token, slug) });

    if (body.restore) {
      const w = await commit(token, [{ update: { name: docName(`shops/${slug}`), fields: { active: { booleanValue: true }, inactiveHold: { booleanValue: false }, updatedAt: { stringValue: new Date().toISOString() } } }, updateMask: { fieldPaths: ['active', 'inactiveHold', 'updatedAt', 'removed'] }, currentDocument: { exists: true } }]);
      return w.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Could not restore the shop.' });
    }

    const note = String(body.note || '').trim().slice(0, 300);
    if (note.length < 3) return res.status(400).json({ error: 'Write the reason (the shop owner sees it).' });
    const at = new Date().toISOString();
    const w = await commit(token, [{
      update: { name: docName(`shops/${slug}`), fields: { active: { booleanValue: false }, removed: { mapValue: { fields: { at: { stringValue: at }, note: { stringValue: note } } } }, updatedAt: { stringValue: at } } },
      updateMask: { fieldPaths: ['active', 'removed', 'updatedAt'] },
      currentDocument: { exists: true },
    }]);
    if (!w.ok) return res.status(502).json({ error: 'Could not remove the shop.' });

    let emailed = false;
    const to = await ownerEmail(token, slug, shop);
    if (to && !body.silent) {
      const shopName = String(shop.name || slug).slice(0, 60);
      const last = new Date(Date.parse(at) + KEEP_DAYS * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
      const subject = `Your Kyvro shop ${shopName} was removed`;
      const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:560px;margin:0 auto;padding:24px;line-height:1.7">
        <p>Kyvro removed your shop <strong>${esc(shopName)}</strong>. Customers cannot open it any more. Reason:</p>
        <p style="padding:12px;border-left:4px solid #D4AF37;background:#faf7ef">${esc(note)}</p>
        <p>আপনার শপটি সরানো হয়েছে। কারণ উপরে লেখা আছে। শপটি ফিরে পেতে চাইলে <strong>${esc(last)}</strong>-এর মধ্যে Kyvro-কে WhatsApp-এ জানান। এরপর শপটি স্থায়ীভাবে মুছে যাবে।</p>
        <p>To get it back, message Kyvro on WhatsApp before <strong>${esc(last)}</strong>. After that it is deleted for good. Your orders are not affected.</p>
        <p><a href="${esc(SITE)}">${esc(SITE)}</a></p></div></body></html>`;
      emailed = await emailOwners([to], subject, html, `Kyvro removed your shop ${shopName}. Reason:\n${note}\n\nTo get it back, message Kyvro on WhatsApp before ${last}. After that it is deleted for good.\n${SITE}`);
    }
    return res.status(200).json({ ok: true, at, emailed });
  } catch (e) {
    console.error('remove shop', e);
    return res.status(500).json({ error: 'Could not remove the shop.' });
  }
}
