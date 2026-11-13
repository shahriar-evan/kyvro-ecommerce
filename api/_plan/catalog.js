// GET /api/plan?action=catalog  (public)
// Every approved product in one answer, cached by Vercel's CDN for 15 minutes (and served stale while it refreshes),
// so customers' visits do not each read ~260 product documents from Firestore (the free plan allows 50,000 reads a day).
// The team still watches products live in Firestore (Admin). Prices are checked again on the server before payment.
import { FS, accessToken, val, QUOTA_MSG } from '../_sslc.js';

const MAX_BYTES = 3800000; // Vercel answers at most ~4.5 MB; bigger = the browser reads Firestore itself

export default async function catalog(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });
  try {
    const token = await accessToken();
    const r = await fetch(`${FS}/documents:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'products' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'approved' } } } } }),
    });
    if (r.status === 429) return res.status(503).json({ error: QUOTA_MSG, code: 'quota' });
    if (!r.ok) return res.status(502).json({ error: 'Could not read the products.' });
    const rows = await r.json();
    const products = rows.filter((x) => x.document).map((x) => Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, val(v)])))
      .sort((a, b) => Number(b.id) - Number(a.id));
    const body = JSON.stringify({ at: new Date().toISOString(), products });
    if (body.length > MAX_BYTES) return res.status(413).json({ error: 'too-big' });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=900, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(body);
  } catch (e) {
    return res.status(500).json({ error: 'server' });
  }
}
