// /api/plan?action=seller-earnings (see api/plan.js): a public seller's markup per order of ALL their own shops
// (one seller can have more than one shop; earnings and payouts are counted together).
// Only what the seller needs: order number, date, status, products, markup. NEVER the customer's name, phone,
// address or email, and nothing about suppliers. The caller must be signed in as that seller.
import { FS, accessToken, val } from '../_sslc.js';
import { planCaller, ownerViewer } from '../_plans.js';
import { orderMarkup } from '../../src/data/priceCheck.js';

export const config = { maxDuration: 30 };



export default async function earnings(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    // ?uid=<seller uid>: the Owner viewing that seller's dashboard (read-only); otherwise the seller themself
    const viewUid = String((req.query && req.query.uid) || '');
    const me = viewUid ? await ownerViewer(req, viewUid) : await planCaller(req);
    if (me.error) return res.status(me.status).json({ error: me.error });
    if (!me.seller || !/^[a-z0-9-]{3,40}$/.test(me.slug)) return res.status(403).json({ error: 'Only sellers have this page.' });
    const token = await accessToken();
    // only shops this account really owns (the list on sellers/{uid} is checked against shops/{slug}.ownerUid)
    const owned = [];
    for (const slug of (me.shops && me.shops.length ? me.shops : [me.slug])) {
      const sr = await fetch(`${FS}/documents/shops/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!sr.ok) continue;
      const sd = await sr.json();
      if (sd.fields && sd.fields.ownerUid && val(sd.fields.ownerUid) === me.uid) owned.push(slug);
    }
    if (!owned.length) owned.push(me.slug);
    const r = await fetch(`${FS}/documents:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'orders' }], where: { fieldFilter: { field: { fieldPath: 'shop' }, op: 'IN', value: { arrayValue: { values: owned.map((x) => ({ stringValue: x })) } } } } } }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Could not load your orders.' });
    const rows = (await r.json()).filter((x) => x.document);
    const orders = rows.map((x) => {
      const f = Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, val(v)]));
      const items = (Array.isArray(f.items) ? f.items : []).map((it) => ({ name: String((it && it.name) || ''), quantity: parseInt(it && it.quantity, 10) || 0, price: Number(it && it.price) || 0, basePrice: it && it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it && it.price) || 0, size: String((it && it.size) || ''), color: String((it && it.color) || '') }));
      const status = String(f.status || '');
      const returned = !!f.returned;
      // minus the shop's own promo code (never below 0)
      const coupon = f.coupon && Number(f.coupon.amount) > 0 ? { code: String(f.coupon.code || ''), amount: Number(f.coupon.amount) || 0 } : null;
      const markup = orderMarkup({ items, coupon });
      return { orderNumber: String(f.orderNumber || ''), shop: String(f.shop || ''), createdAt: f.createdAt || '', status, returned, items, markup, coupon, earned: status === 'Delivered' && !returned ? markup : 0 };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const earned = orders.reduce((n, o) => n + o.earned, 0);
    const waiting = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).reduce((n, o) => n + o.markup, 0);
    return res.status(200).json({ slug: me.slug, shops: owned, earned, waiting, orders });
  } catch (e) {
    console.error('seller-earnings', e);
    return res.status(500).json({ error: 'Could not load your earnings.' });
  }
}
