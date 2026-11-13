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
export const DEFAULT_PLANS = {
  enabled: true, freeLimit: 10, freeCategoryLimit: 3, periodDays: 30, reminderDays: 3,
  // how many shops one seller account may have, by its plan (also checked in firestore.rules: shopLimitFor)
  shopLimits: { free: 1, pro: 2, premium: 3 },
  pro: { price: 999, discount: 40 },
  premium: { price: 2999, discount: 40 },
  // Basic (internal tier id 'free'). While it costs ৳0 (100% off) nobody pays. When the Owner removes the discount, only
  // sellers who open their store after that pay (every periodDays); sellers who opened their store while it was ৳0 keep
  // Basic free (basicFree on shops/sellers, set when the store opens). Back to 100% off = nobody pays.
  basic: { price: 499, discount: 100, label: 'Launch offer', endsAt: '' },
  supportWhatsapp: '',
};
export const PLAN_TIERS = ['pro', 'premium'];
// shown names; the internal id of the first plan stays 'free' everywhere (rules, subscriptions, shops)
export const TIER_LABEL = { free: 'Basic', pro: 'Pro', premium: 'Premium' };
// the most products a shop document can hold at all (also checked in firestore.rules)
export const SHOP_MAX_ITEMS = 300;
const num = (v, def, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : def; };
// card label ('Launch offer') and offer end date (YYYY-MM-DD): shown on the plan card only, never used for the price
const cardLabel = (v, def) => String(v === undefined ? def : v).replace(/[<>]/g, '').trim().slice(0, 40);
const cardDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const tierCfg = (t, def, legacy) => ({
  price: num(t && t.price !== undefined ? t.price : legacy.price, def.price, 1, 1000000),
  discount: num(t && t.discount !== undefined ? t.discount : legacy.discount, def.discount, 0, 90),
  label: cardLabel(t && t.label, ''),
  endsAt: cardDate(t && t.endsAt),
});
// Basic card: list price, discount 0 to 100, a short label and an optional end date (YYYY-MM-DD, shown only)
const basicCfg = (b) => {
  const x = b || {};
  const label = cardLabel(x.label, DEFAULT_PLANS.basic.label);
  const endsAt = cardDate(x.endsAt);
  return {
    price: num(x.price, DEFAULT_PLANS.basic.price, 0, 1000000),
    discount: num(x.discount, DEFAULT_PLANS.basic.discount, 0, 100),
    label,
    endsAt,
  };
};
// settings/plans -> clean numbers. Before tiers there was one paid plan (originalPrice / discountPercent): that is Pro.
// per-plan feature switches set by the Owner (settings/plans.tierFeatures): { free: {key: bool}, pro: {...}, premium: {...} }.
// A key that is not set falls back to the built-in default (FEATURES in src/data/shopBrand.js). Same in firestore.rules (featOn).
const cleanTierFeatures = (tf) => Object.fromEntries(['free', 'pro', 'premium'].map((t) => {
  const m = (tf && tf[t]) || {};
  return [t, Object.fromEntries(Object.entries(m).filter(([k, v]) => /^[A-Za-z]{1,30}$/.test(k) && typeof v === 'boolean').slice(0, 30))];
}));
export const normalizePlans = (p) => {
  const x = p || {};
  const pro = tierCfg(x.pro, DEFAULT_PLANS.pro, { price: x.originalPrice, discount: x.discountPercent });
  const premium = tierCfg(x.premium, DEFAULT_PLANS.premium, {});
  const wa = String(x.supportWhatsapp || '').replace(/[\s()-]/g, '');
  return {
    enabled: x.enabled !== false,
    freeLimit: num(x.freeLimit, DEFAULT_PLANS.freeLimit, 1, SHOP_MAX_ITEMS),
    // Free plan: products from at most this many categories (Pro / Premium: all categories)
    freeCategoryLimit: num(x.freeCategoryLimit, DEFAULT_PLANS.freeCategoryLimit, 1, 20),
    tierFeatures: cleanTierFeatures(x.tierFeatures),
    shopLimits: Object.fromEntries(['free', 'pro', 'premium'].map((t) => [t, num(x.shopLimits && x.shopLimits[t], DEFAULT_PLANS.shopLimits[t], 1, 5)])),
    periodDays: num(x.periodDays, DEFAULT_PLANS.periodDays, 1, 366),
    reminderDays: num(x.reminderDays, DEFAULT_PLANS.reminderDays, 0, 30),
    pro,
    premium,
    basic: basicCfg(x.basic),
    supportWhatsapp: /^\+?[0-9]{8,15}$/.test(wa) ? wa : '',
    // older code reads these: they are the Pro numbers
    originalPrice: pro.price,
    discountPercent: pro.discount,
  };
};
// how many shops a seller account may have on this tier ('free' | 'pro' | 'premium')
export const shopLimitFor = (plans, tier) => normalizePlans(plans).shopLimits[tier === 'premium' ? 'premium' : tier === 'pro' ? 'pro' : 'free'];
// what a seller pays for one period of a tier, e.g. Pro 999 with 40% off = 599, Premium 2999 - 40% = 1799
export const planPrice = (plans, tier = 'pro') => {
  const c = normalizePlans(plans)[tier === 'premium' ? 'premium' : 'pro'];
  return Math.round((c.price * (100 - c.discount)) / 100);
};
// what Basic costs for one period (৳0 while the launch offer runs)
export const basicPrice = (plans) => {
  const b = normalizePlans(plans).basic;
  return Math.round((b.price * (100 - b.discount)) / 100);
};
// Basic is charged right now: plans on and the price at least ৳1. Same test in firestore.rules (basicFreeNow).
export const basicCharging = (plans) => {
  const p = normalizePlans(plans);
  return p.enabled && p.basic.price * (100 - p.basic.discount) >= 50;
};
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
// the tier that counts right now for a subscription or a shop: 'free' once paidUntil has passed;
// a paid plan from before tiers (no tier) is Pro
export const effectiveTier = (x, now = Date.now()) => (toMillis(x && x.paidUntil) > now ? (x.tier === 'premium' ? 'premium' : 'pro') : 'free');
// A seller's shop that must pay Basic and has not (or its paid Basic period ended): customers do not see it.
// Never for team shops, the Owner's shop, shops opened while Basic was free (basicFree not false), a running
// Pro / Premium, or while Basic costs ৳0.
// A shop order's markup for its owner: (shop price - store price) x qty for every item, minus the shop's own promo code
// (a promo code only ever comes out of the markup, never out of Kyvro's price). Never below 0.
export const itemsMarkup = (items) => (items || []).reduce((n, it) => n + Math.max(0, (Number(it && it.price) || 0) - (it && it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it && it.price) || 0)) * (parseInt(it && it.quantity, 10) || 0), 0);
// ---- Promo codes (Premium feature "coupons"): shops/{slug}.coupons = { CODE: { percent 1-50, minOrder, endsAt, active } }
// (at most 5). The customer gets percent % off the products, but never more than the shop's own markup on the order,
// so Kyvro's store price is never reduced. Same checks in firestore.rules (orders create) and checkOrderPrices below.
export const COUPON_MAX_PERCENT = 50;
export const COUPON_MAX = 5;
export const cleanCouponCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
export const couponActive = (shop, code, now = Date.now()) => {
  const c = shop && shop.coupons && typeof shop.coupons === 'object' ? shop.coupons[code] : null;
  if (!c || c.active !== true) return null;
  const percent = parseInt(c.percent, 10);
  if (!(percent >= 1 && percent <= COUPON_MAX_PERCENT)) return null;
  if (c.endsAt && /^\d{4}-\d{2}-\d{2}$/.test(c.endsAt) && Date.parse(`${c.endsAt}T23:59:59+06:00`) < now) return null;
  return { code, percent, minOrder: Math.max(0, parseInt(c.minOrder, 10) || 0) };
};
// the amount off: percent of (products after the store discount), capped at the shop's markup; whole taka
export const couponAmountFor = (items, coupon, net) => (!coupon || net < coupon.minOrder ? 0
  : Math.max(0, Math.min(Math.floor((net * coupon.percent) / 100), Math.floor(itemsMarkup(items)))));
// ---- Main store promo codes (Owner: Admin > Settings > Promo codes): settings/promos.codes =
// { CODE: { percent 1-50, minOrder, maxOff (৳, 0 = no cap), endsAt, active } } (at most STORE_COUPON_MAX). Only on the
// main store (never on a shop link, shops have their own). The discount comes out of Kyvro's own price.
// Same checks in firestore.rules (orders create: couponOk) and checkOrderPrices below.
export const STORE_COUPON_MAX = 20;
export const storeCouponActive = (promos, code, now = Date.now()) => {
  const base = couponActive({ coupons: promos && promos.codes }, code, now);
  if (!base) return null;
  return { ...base, maxOff: Math.max(0, parseInt(promos.codes[code].maxOff, 10) || 0) };
};
export const storeCouponAmount = (coupon, net) => (!coupon || net < coupon.minOrder ? 0
  : Math.max(0, Math.min(Math.floor((net * coupon.percent) / 100), coupon.maxOff > 0 ? coupon.maxOff : Infinity)));
export const orderMarkup = (o) => Math.max(0, itemsMarkup(o && o.items) - (o && o.coupon ? Number(o.coupon.amount) || 0 : 0));
export const basicDue = (shop, plans, now = Date.now()) => !!shop && shop.kind === 'seller' && shop.basicFree === false
  && shop.planExempt !== true && basicCharging(plans) && !shopIsPaid(shop, now) && toMillis(shop.basicUntil) <= now;
// The products a shop may show right now: null = all of them. A shop whose paid plan ran out shows only its
// freeLimit best sellers (most "sold"; ties and no sales: the product added to the store first). The rest are
// hidden, not deleted, and come back when the plan is renewed. The Owner's own shop has no limit.
export function visibleShopIds(shop, productsById, plans, now = Date.now()) {
  const p = normalizePlans(plans);
  const all = shop && shop.features && typeof shop.features.allProducts === 'boolean' ? shop.features.allProducts : shopIsPaid(shop, now);
  if (!shop || !p.enabled || shop.planExempt === true || all) return null;
  const ids = Object.keys(shop.items || {});
  if (ids.length <= p.freeLimit) return null;
  const sold = (id) => { const pr = productsById[String(id)]; return pr ? (parseInt(pr.sold, 10) || 0) : -1; };
  const ranked = ids.sort((a, b) => (sold(b) - sold(a)) || ((Number(a) || 0) - (Number(b) || 0)) || a.localeCompare(b));
  return new Set(ranked.slice(0, p.freeLimit));
}

// Orders placed before shop plans went live are never refused for a hidden product. Set this to the day the plans
// were deployed (orders from before it were placed when every product of a shop was showing).
export const PLANS_START = '2026-11-05T00:00:00+06:00';
// The same limit, but for an order that was already placed: a product the customer could see when ordering stays
// payable. An order placed while the shop's plan was paid (or before plans started) is never limited; an order placed
// on the Free plan is checked against the shop's best sellers.
export function orderVisibleIds(order, shop, productsById, plans, now = Date.now()) {
  const placed = toMillis(order && order.createdAt);
  if (!shop || (placed && (placed <= toMillis(shop.paidUntil) || placed < toMillis(PLANS_START)))) return null;
  return visibleShopIds(shop, productsById, plans, now);
}

// Checks the prices saved in an order against the live products (and the shop, for a shop-link order).
// The browser writes the order, so a customer could change the prices before saving it: this catches that.
//   productsById: { [id]: product }   shop: the shops/{slug} document, or null / undefined when it does not exist
//   visible: the shop's visibleShopIds() (null = no limit): a product hidden by an expired plan cannot be bought
// Returns { ok, problems: [text], subtotal } (subtotal = what the items really cost)
export function checkOrderPrices(order, productsById, shop, visible = null, promos = null) {
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
    // out of stock at the supplier (stock sync): refused until someone approves it back
    if (p.supplierOut && (p.supplierOut['*'] === true || (it.color && p.supplierOut[it.color] === true))) { problems.push(`${name}: out of stock`); continue; }
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
  // the shop's promo code: it must exist (and run) on the shop, and take no more than allowed (never past the markup)
  // a main store order: the Owner's store promo code (settings/promos), never more than its % and its ৳ cap
  if (order.coupon) {
    const code = String(order.coupon.code || '');
    const at = toMillis(order.createdAt) || Date.now();
    const c = inShop ? (shop ? couponActive(shop, code, at) : null) : storeCouponActive(promos, code, at);
    const net = (Number(order.subtotal) || 0) - (Number(order.discount) || 0);
    if (!c) problems.push(`Promo code ${code || '?'} is not valid ${inShop ? 'for this shop' : 'on the main store'}`);
    else {
      const most = inShop ? couponAmountFor(order.items, c, net) : storeCouponAmount(c, net);
      if (Number(order.coupon.percent) !== c.percent) problems.push(`Promo code ${code}: ${order.coupon.percent}% should be ${c.percent}%`);
      if (Number(order.coupon.amount) > most) problems.push(`Promo code ${code}: ${order.coupon.amount} off, at most ${most}`);
    }
  }
  return { ok: problems.length === 0, problems, subtotal };
}
