// GET /sitemap.xml (vercel.json rewrite -> /api/plan?action=sitemap): every page Google should know about.
// Home, every approved product (?product=ID) and every live shop link (kyvro.store/<handle>). Public data only.
import { SITE, FS, accessToken, val } from '../_sslc.js';
import { readPlans } from '../_plans.js';
import { basicDue, shopIsPaid, toMillis } from '../../src/data/priceCheck.js';

const fieldsOf = (d) => Object.fromEntries(Object.entries((d && d.fields) || {}).map(([k, v]) => [k, val(v)]));
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
// the site answers on www (kyvro.store redirects there), so the sitemap lists the www addresses
const BASE = SITE.replace('://kyvro.store', '://www.kyvro.store');
const day = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

async function list(token, col) {
  const out = [];
  let pageToken = '';
  do {
    const r = await fetch(`${FS}/documents/${col}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) break;
    const j = await r.json();
    for (const d of j.documents || []) out.push({ id: d.name.split('/').pop(), updateTime: d.updateTime, ...fieldsOf(d) });
    pageToken = j.nextPageToken || '';
  } while (pageToken && out.length < 5000);
  return out;
}

export default async function handler(req, res) {
  try {
    const token = await accessToken();
    const plans = await readPlans(token);
    const [products, shops] = await Promise.all([list(token, 'products'), list(token, 'shops')]);
    const urls = [{ loc: `${BASE}/`, pri: '1.0' }];
    for (const p of products) {
      if ((p.status || 'approved') !== 'approved') continue;
      urls.push({ loc: `${BASE}/?product=${encodeURIComponent(p.id)}`, last: day(Date.parse(p.updateTime)), pri: '0.8' });
    }
    for (const s of shops) {
      const live = s.active !== false && s.status !== 'pending' && !s.killed && !(s.extra && !shopIsPaid(s)) && !basicDue(s, plans);
      if (!live || !/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(String(s.handle || ''))) continue;
      urls.push({ loc: `${BASE}/${s.handle}`, last: day(toMillis(s.updatedAt) || Date.parse(s.updateTime)), pri: '0.6' });
    }
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.last ? `<lastmod>${u.last}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(body);
  } catch (e) {
    console.error('sitemap', e);
    return res.status(500).send('sitemap failed');
  }
}
