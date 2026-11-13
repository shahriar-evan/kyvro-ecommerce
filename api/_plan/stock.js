// Supplier stock sync:  /api/plan?action=stock
//
//   GET  (Vercel Cron, Bearer CRON_SECRET)     check part of the catalogue against the suppliers (continues where it stopped)
//   POST {op:'check'}           Owner / Manager  same, from the Admin "Check supplier stock" button (called again until done)
//   POST {op:'hide', id}        any team member  takes a product off the website (status 'hidden')
//   POST {op:'approve', id}     Owner / "Approve products"  puts it back: colours that came back in stock are sold again
//
// What a check writes on products/{id} (server only, never by the app):
//   supplierOut  {colour: true}  this colour is out of stock at every supplier link it has ('*' = the whole product)
//   backInStock  {colour: true}  was out, the supplier has it again: still not sold until someone approves it
// The storefront treats supplierOut colours as stock 0 (src/data/catalog.js), and checkOrderPrices refuses them.
//
// Suppliers:
//   SelfShop  public API api-v1.selfshop.com.bd/api/product-details/<slug> (qty + status, no login)
//   ShopBase  needs a reseller login: Vercel env SHOPBASE_USERNAME (phone) + SHOPBASE_PASSWORD, set by the Owner.
//             Without them ShopBase links are skipped (nothing changes for those colours).
// A link that cannot be read counts as "in stock", so a supplier hiccup never takes products down.
import { FS, accessToken, val } from '../_sslc.js';
import { ownerEmails, emailOwners } from '../_owners.js';

const TIME_BUDGET_MS = 45000;
const STATE = 'stockCheck/state'; // server-only collection (no rule lets the app read or write it)

// ---------- Firestore (service account) ----------
const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
};
const fromDoc = (d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)])) });

async function listAll(token, collection) {
  const out = [];
  let page = '';
  do {
    const r = await fetch(`${FS}/documents/${collection}?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Could not read ${collection}.`);
    const j = await r.json();
    (j.documents || []).forEach((d) => out.push(fromDoc(d)));
    page = j.nextPageToken || '';
  } while (page);
  return out;
}

async function readOne(token, path) {
  const r = await fetch(`${FS}/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Could not read ${path}.`);
  return fromDoc(await r.json());
}

async function commit(token, writes) {
  for (let i = 0; i < writes.length; i += 400) {
    const r = await fetch(`${FS}/documents:commit`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: writes.slice(i, i + 400) }),
    });
    if (!r.ok) throw new Error(`Saving failed (${r.status}).`);
  }
}
const docName = (path) => `${FS.replace('https://firestore.googleapis.com/v1/', '')}/documents/${path}`;
const patch = (path, data, mustExist = true) => ({
  update: { name: docName(path), fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) },
  updateMask: { fieldPaths: Object.keys(data) },
  ...(mustExist ? { currentDocument: { exists: true } } : {}),
});

// ---------- who is calling ----------
function claimsOf(req) {
  const auth = req.headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  try { return { idToken, claims: JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')) }; } catch (e) { return { idToken, claims: {} }; }
}
// team entry read with the caller's own token (so the token is real); the fixed Owner has no entry (404 for a valid login)
async function teamMember(req) {
  const { idToken, claims } = claimsOf(req);
  const email = String(claims.email || '').toLowerCase();
  if (!email) return null;
  const r = await fetch(`${FS}/documents/admins/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (r.ok) {
    const f = fromDoc(await r.json());
    if (f.active === false) return null;
    const role = f.role === 'owner' ? 'owner' : f.role === 'manager' ? 'manager' : 'admin';
    return { email, role, canApprove: role === 'owner' || f.canApprove === true, name: f.name || email };
  }
  if (r.status === 404 && claims.email_verified === true) {
    const owners = await ownerEmails(await accessToken());
    if (owners.has(email)) return { email, role: 'owner', canApprove: true, name: claims.name || email };
  }
  let why = '';
  try { why = ((await r.json()).error || {}).status || ''; } catch (e) { /* no body */ }
  console.error('stock team check', email, r.status, why, claims.email_verified);
  return { denied: `${email} · ${r.status}${why ? ` ${why}` : ''}${claims.email_verified === true ? '' : ' · email not verified'}` };
}

// ---------- suppliers ----------
const selfshopSlug = (u) => (String(u).match(/selfshop\.com\.bd\/(?:api\/)?product(?:-details)?\/([^/?#]+)/i) || [])[1];
const shopbaseId = (u) => (String(u).match(/shopbasebd\.com\/store\/products\/details\/(\d+)/i) || [])[1];

export async function selfshopInStock(slug) {
  const r = await fetch(`https://api-v1.selfshop.com.bd/api/product-details/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const p = ((await r.json()) || {}).data?.product_details;
  if (!p) return null;
  if (String(p.status || '').toLowerCase() !== 'active') return false;
  const sizes = (p.varients || []).flatMap((v) => (String(v.status || 'Active').toLowerCase() === 'active' ? (v.sizes || []) : []));
  const fromSizes = sizes.filter((s) => String(s.status || 'Active').toLowerCase() === 'active').reduce((n, s) => n + (Number(s.qty) || 0), 0);
  return (sizes.length ? fromSizes : Number(p.qty) || 0) > 0;
}

// one logged-in ShopBase session per run (cookies kept by hand: Node fetch has no cookie jar)
async function shopbaseSession() {
  const user = process.env.SHOPBASE_USERNAME, pass = process.env.SHOPBASE_PASSWORD;
  if (!user || !pass) return null;
  const jar = new Map();
  const keep = (r) => (r.headers.getSetCookie ? r.headers.getSetCookie() : []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1)); });
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const ua = 'Mozilla/5.0 (compatible; KyvroStock/1.0)';
  const page = await fetch('https://shopbasebd.com/store/login', { headers: { 'User-Agent': ua } });
  keep(page);
  const html = await page.text();
  const token = (html.match(/name="csrf-token"\s+content="([^"]+)"/) || html.match(/'_token':\s*'([^']+)'/) || [])[1];
  if (!token) return null;
  const login = await fetch('https://shopbasebd.com/store/logincheck', {
    method: 'POST',
    headers: { 'User-Agent': ua, Cookie: cookie(), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ username: user, password: pass, _token: token }).toString(),
  });
  keep(login);
  const res = await login.json().catch(() => ({}));
  if (res.result !== 'success') return null;
  return async (id) => {
    const r = await fetch(`https://shopbasebd.com/store/products/details/${id}`, { headers: { 'User-Agent': ua, Cookie: cookie() }, redirect: 'manual' });
    if (r.status !== 200) return null;
    const t = await r.text();
    const m = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/স্টক:\s*(\S+)/);
    if (!m) return null;
    return m[1].startsWith('আছে');
  };
}

// every supplier link of one colour (its own link, else the main one, plus backup links and other suppliers)
export function linksFor(cost, colour) {
  const own = (cost.colorLinks && cost.colorLinks[colour]) || cost.supplierLink || '';
  const alt = ((cost.colorAltLinks && cost.colorAltLinks[colour]) || []).map((a) => (a && a.link) || '');
  // other suppliers are product-wide: only used when this colour has no link of its own
  const extra = (cost.colorLinks && cost.colorLinks[colour]) ? [] : (cost.extraSuppliers || []).map((s) => (s && s.link) || '');
  return [own, ...alt, ...extra].filter((u) => /^https:\/\//i.test(String(u)));
}

// ---------- the check ----------
async function runCheck(token, { manual = false } = {}) {
  const started = Date.now();
  const state = (await readOne(token, STATE)) || {};
  const [products, costs] = await Promise.all([listAll(token, 'products'), listAll(token, 'productCosts')]);
  const costById = Object.fromEntries(costs.map((c) => [c.id, c]));
  const queue = products.filter((p) => ['approved', 'hidden'].includes(p.status || 'approved') && costById[p.id])
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const startAt = state.cursor ? queue.findIndex((p) => String(p.id) > String(state.cursor)) : 0;
  const todo = startAt < 0 ? [] : queue.slice(startAt);
  const sb = await shopbaseSession().catch(() => null);
  const memo = new Map();
  const check = (u) => {
    if (memo.has(u)) return memo.get(u);
    const slug = selfshopSlug(u), id = shopbaseId(u);
    const job = (slug ? selfshopInStock(slug) : id && sb ? sb(id) : Promise.resolve(null)).catch(() => null);
    memo.set(u, job);
    return job;
  };
  const writes = [];
  const changes = [];
  let last = state.cursor || '';
  let done = 0;
  for (const p of todo) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const cost = costById[p.id];
    const colours = Array.isArray(p.colors) && p.colors.length ? p.colors : ['*'];
    const results = await Promise.all(colours.map(async (c) => {
      const links = linksFor(cost, c === '*' ? '' : c);
      if (!links.length) return [c, null];
      const r = await Promise.all(links.map(check));
      if (r.some((x) => x === true)) return [c, true];
      if (r.length && r.every((x) => x === false)) return [c, false];
      return [c, null]; // unknown: leave as it is
    }));
    const out = { ...(p.supplierOut || {}) };
    const back = { ...(p.backInStock || {}) };
    const before = JSON.stringify([out, back]);
    for (const [c, inStock] of results) {
      if (inStock === false) {
        if (!out[c]) changes.push({ id: p.id, name: p.name, colour: c, what: 'out' });
        out[c] = true; delete back[c];
      } else if (inStock === true && out[c]) {
        if (!back[c]) changes.push({ id: p.id, name: p.name, colour: c, what: 'back' });
        back[c] = true;
      }
    }
    // colours that no longer exist on the product
    Object.keys(out).forEach((c) => { if (c !== '*' && !colours.includes(c)) { delete out[c]; delete back[c]; } });
    if (JSON.stringify([out, back]) !== before) writes.push(patch(`products/${p.id}`, { supplierOut: out, backInStock: back, stockCheckedAt: new Date().toISOString() }));
    last = String(p.id);
    done += 1;
  }
  const finished = startAt < 0 || done === todo.length;
  const prevChanges = Array.isArray(state.pending) ? state.pending : [];
  const allChanges = [...prevChanges, ...changes].slice(-200);
  writes.push(patch(STATE, {
    cursor: finished ? '' : last,
    pending: finished ? [] : allChanges,
    lastRunAt: new Date().toISOString(),
    ...(finished ? { lastFullRunAt: new Date().toISOString(), shopbase: sb ? 'ok' : (process.env.SHOPBASE_USERNAME ? 'login failed' : 'not set') } : {}),
  }, false));
  await commit(token, writes);
  // one email per full round, only when something changed (the Admin page shows the same list)
  if (finished && allChanges.length && !manual) {
    try {
      const owners = await ownerEmails(token);
      const line = (x) => `${x.name}${x.colour === '*' ? '' : ` (${x.colour})`}`;
      const outs = allChanges.filter((x) => x.what === 'out').map(line);
      const backs = allChanges.filter((x) => x.what === 'back').map(line);
      const text = [outs.length ? `Out of stock at the supplier (shown as Stock out):\n- ${outs.join('\n- ')}` : '', backs.length ? `Back in stock (approve in Admin → Products to sell again):\n- ${backs.join('\n- ')}` : ''].filter(Boolean).join('\n\n');
      await emailOwners(owners, `Kyvro supplier stock: ${outs.length} out, ${backs.length} back`, `<pre style="font:14px/1.5 sans-serif;white-space:pre-wrap">${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</pre>`, text);
    } catch (e) { console.error('stock email', e); }
  }
  return { done: finished, checked: done, left: finished ? 0 : todo.length - done, total: queue.length, changes, shopbase: sb ? 'ok' : (process.env.SHOPBASE_USERNAME ? 'login failed' : 'not set') };
}

export default async function stock(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const token = await accessToken();
    if (req.method === 'GET') {
      const secret = process.env.CRON_SECRET || '';
      if (!secret || (req.headers.authorization || '') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Not allowed.' });
      return res.status(200).json(await runCheck(token));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const me = await teamMember(req);
    if (!me || me.denied) return res.status(403).json({ error: `Only the team can use this.${me && me.denied ? ` (${me.denied})` : ''}` });
    const op = String(body.op || '');
    if (op === 'check') {
      if (me.role === 'admin') return res.status(403).json({ error: 'Only the Owner or a Manager can run the stock check.' });
      return res.status(200).json(await runCheck(token, { manual: true }));
    }
    const id = String(body.id || '');
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) return res.status(400).json({ error: 'Which product?' });
    const p = await readOne(token, `products/${id}`);
    if (!p) return res.status(404).json({ error: 'Product not found.' });
    const now = new Date().toISOString();
    if (op === 'hide') {
      if ((p.status || 'approved') !== 'approved') return res.status(409).json({ error: 'This product is not on the website.' });
      await commit(token, [patch(`products/${id}`, { status: 'hidden', hiddenBy: me.email, hiddenByName: me.name, hiddenAt: now })]);
      return res.status(200).json({ ok: true, status: 'hidden' });
    }
    if (op === 'approve') {
      if (!me.canApprove) return res.status(403).json({ error: 'You do not have permission to approve products.' });
      const out = { ...(p.supplierOut || {}) };
      Object.keys(p.backInStock || {}).forEach((c) => { delete out[c]; });
      const data = { supplierOut: out, backInStock: {} };
      if ((p.status || 'approved') === 'hidden') Object.assign(data, { status: 'approved', approvedBy: me.email, approvedByName: me.name, approvedAt: now });
      await commit(token, [patch(`products/${id}`, data)]);
      return res.status(200).json({ ok: true, status: data.status || p.status || 'approved', stillOut: Object.keys(out) });
    }
    return res.status(400).json({ error: 'Unknown request.' });
  } catch (e) {
    console.error('stock', e);
    return res.status(500).json({ error: 'The stock check could not finish. Please try again.' });
  }
}
