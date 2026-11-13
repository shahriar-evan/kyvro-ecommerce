// Find Kyvro products by a pasted supplier link (ShopBase / SelfShop / any shop link).
// Uses the private productCosts, which the app only loads for the Owner and Managers,
// so Admins and customers can never match a supplier link (supplier data stays hidden from them).

// One comparable key per link: ShopBase product id, SelfShop product slug, else the plain address.
export function linkKey(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}\//.test(s)) return '';
  const sb = s.match(/shopbasebd\.com\/store\/products\/details\/(\d+)/);
  if (sb) return `shopbase:${sb[1]}`;
  const ss = s.match(/selfshop\.com\.bd\/(?:api\/)?product(?:-details)?\/([^/?#]+)/);
  if (ss) return `selfshop:${decodeURIComponent(ss[1])}`;
  return s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
}

// every http(s) link inside a productCosts record (main link, per-colour links, backup links, other suppliers)
function linksIn(value, out = []) {
  if (typeof value === 'string') { if (/^https?:\/\//i.test(value.trim())) out.push(value); }
  else if (Array.isArray(value)) value.forEach((v) => linksIn(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => linksIn(v, out));
  return out;
}

// Set of product ids whose supplier links match the query, or null when the query is not a link
export function productIdsForLink(query, productCosts) {
  const key = linkKey(query);
  if (!key || !productCosts) return null;
  const ids = new Set();
  Object.entries(productCosts).forEach(([id, c]) => {
    if (linksIn(c).some((u) => linkKey(u) === key)) ids.add(String(id));
  });
  return ids;
}
