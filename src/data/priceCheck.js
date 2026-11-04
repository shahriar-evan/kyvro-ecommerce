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

// ---------------------------------------------------------------------------
// Shop plans: Free = up to freeLimit products shown, Paid = all of them for periodDays. The Owner edits these numbers
// (settings/plans). The server always takes the price from that document, never from the browser.
// ---------------------------------------------------------------------------
export const DEFAULT_PLANS = { enabled: true, originalPrice: 999, discountPercent: 40, freeLimit: 10, periodDays: 30, reminderDays: 3 };
// the most products a shop document can hold at all (also checked in firestore.rules)
export const SHOP_MAX_ITEMS = 300;
const num = (v, def, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : def; };
export const normalizePlans = (p) => {
  const x = p || {};
  return {
    enabled: x.enabled !== false,
    originalPrice: num(x.originalPrice, DEFAULT_PLANS.originalPrice, 1, 1000000),
    discountPercent: num(x.discountPercent, DEFAULT_PLANS.discountPercent, 0, 90),
    freeLimit: num(x.freeLimit, DEFAULT_PLANS.freeLimit, 1, SHOP_MAX_ITEMS),
    periodDays: num(x.periodDays, DEFAULT_PLANS.periodDays, 1, 366),
    reminderDays: num(x.reminderDays, DEFAULT_PLANS.reminderDays, 0, 30),
  };
};
// what a customer pays for one period, e.g. 999 with 40% off = 599
export const planPrice = (plans) => { const p = normalizePlans(plans); return Math.round(p.originalPrice * (1 - p.discountPercent / 100)); };
// a Firestore Timestamp, an ISO text or milliseconds -> milliseconds (0 = none)
export const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
};
export const shopIsPaid = (shop, now = Date.now()) => toMillis(shop && shop.paidUntil) > now;
// The products a shop may show right now: null = all of them. A shop whose paid plan ran out shows only its
// freeLimit best sellers (most "sold"; ties and no sales: the product added to the store first). The rest are
// hidden, not deleted, and come back when the plan is renewed. The Owner's own shop has no limit.
export function visibleShopIds(shop, productsById, plans, now = Date.now()) {
  const p = normalizePlans(plans);
  if (!shop || !p.enabled || shop.planExempt === true || shopIsPaid(shop, now)) return null;
  const ids = Object.keys(shop.items || {});
  if (ids.length <= p.freeLimit) return null;
  const sold = (id) => { const pr = productsById[String(id)]; return pr ? (parseInt(pr.sold, 10) || 0) : -1; };
  const ranked = ids.sort((a, b) => (sold(b) - sold(a)) || ((Number(a) || 0) - (Number(b) || 0)) || a.localeCompare(b));
  return new Set(ranked.slice(0, p.freeLimit));
}

// Checks the prices saved in an order against the live products (and the shop, for a shop-link order).
// The browser writes the order, so a customer could change the prices before saving it: this catches that.
//   productsById: { [id]: product }   shop: the shops/{slug} document, or null / undefined when it does not exist
//   visible: the shop's visibleShopIds() (null = no limit): a product hidden by an expired plan cannot be bought
// Returns { ok, problems: [text], subtotal } (subtotal = what the items really cost)
export function checkOrderPrices(order, productsById, shop, visible = null) {
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
      if (visible && !visible.has(String(it.id))) { problems.push(`${name}: hidden in this shop (its plan ran out)`); continue; }
      expected = shopPriceClamp(base, wanted);
    }
    if (Number(it.price) !== expected) problems.push(`${name}: price ${it.price}, should be ${expected}`);
    if (it.basePrice !== undefined && Number(it.basePrice) !== base) problems.push(`${name}: store price ${it.basePrice}, should be ${base}`);
    subtotal += expected * q;
  }
  if (!problems.length && Number(order.subtotal) !== subtotal) problems.push(`Subtotal ${order.subtotal}, should be ${subtotal}`);
  return { ok: problems.length === 0, problems, subtotal };
}
