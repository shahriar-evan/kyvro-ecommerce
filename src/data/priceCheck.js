// Shop markup limits + the order price check. Plain JavaScript with no browser-only parts, so the same code runs
// in the website (Orders panel) and on the server (api/ payment functions).

// ---------------------------------------------------------------------------
// Admin shops ("?shop=name" links): the highest price an admin may sell a product for, by the Owner's (base) price.
// 100 -> 149, 300 -> 399, 400 -> 549, 1200 -> 1450. To change the limits, change the numbers below.
// ---------------------------------------------------------------------------
export const SHOP_MARKUP_BANDS = [
  { upTo: 199, add: 49 },
  { upTo: 399, add: 99 },
  { upTo: 799, add: 149 },
  { upTo: 1999, add: 250 },
  { upTo: 4999, add: 350 },
  { upTo: Infinity, add: 500 },
];
export const maxMarkupFor = (base) => {
  const b = Number(base) || 0;
  const band = SHOP_MARKUP_BANDS.find((x) => b <= x.upTo);
  return band ? band.add : 0;
};
// The price a shop may really use: never below the base price, never above base + the allowed markup
export const shopPriceClamp = (base, wanted) => {
  const b = Number(base) || 0;
  const w = Number(wanted);
  if (!isFinite(w)) return b;
  return Math.max(b, Math.min(Math.round(w), b + maxMarkupFor(b)));
};

// Checks the prices saved in an order against the live products (and the shop, for a shop-link order).
// The browser writes the order, so a customer could change the prices before saving it: this catches that.
//   productsById: { [id]: product }   shop: the shops/{slug} document, or null / undefined when it does not exist
// Returns { ok, problems: [text], subtotal } (subtotal = what the items really cost)
export function checkOrderPrices(order, productsById, shop) {
  const problems = [];
  let subtotal = 0;
  const inShop = !!order.shop;
  if (inShop && (!shop || shop.active === false)) problems.push(`Shop "${order.shop}" does not exist or is switched off`);
  for (const it of order.items || []) {
    const name = String(it.name || it.id || 'item');
    const p = productsById[String(it.id)];
    const q = Number(it.quantity);
    if (!Number.isInteger(q) || q < 1) { problems.push(`${name}: wrong quantity`); continue; }
    if (!p || (p.status || 'approved') !== 'approved') { problems.push(`${name}: not for sale in the store`); continue; }
    const base = Number(p.price) || 0;
    let expected = base;
    if (inShop && shop) {
      const wanted = shop.items && shop.items[String(it.id)];
      if (wanted === undefined) { problems.push(`${name}: not in this shop`); continue; }
      expected = shopPriceClamp(base, wanted);
    }
    if (Number(it.price) !== expected) problems.push(`${name}: price ${it.price}, should be ${expected}`);
    if (it.basePrice !== undefined && Number(it.basePrice) !== base) problems.push(`${name}: store price ${it.basePrice}, should be ${base}`);
    subtotal += expected * q;
  }
  if (!problems.length && Number(order.subtotal) !== subtotal) problems.push(`Subtotal ${order.subtotal}, should be ${subtotal}`);
  return { ok: problems.length === 0, problems, subtotal };
}
