// ---------------------------------------------------------------------------
// Delivery + payment settings (amounts are in BDT)
// NOTE: the same delivery charges are checked in firestore.rules. If you change a charge
// here, change it in the rules too, otherwise new orders will be rejected.
// ---------------------------------------------------------------------------

// WhatsApp number for "Order on WhatsApp" (country code + number, no + or spaces). Change it here once.
export const WHATSAPP_NUMBER = '8801770849168';

export const DELIVERY_AREAS = ['Inside Dhaka', 'Outside Dhaka'];
export const DELIVERY_AREA_BN = { 'Inside Dhaka': 'ঢাকার ভিতরে', 'Outside Dhaka': 'ঢাকার বাইরে' };

// Delivery area is worked out from the customer's district + thana/upazila:
// "Inside Dhaka" = every Dhaka city thana (Mirpur, Dhanmondi, Gulshan...) plus the places listed below.
// Everywhere else = "Outside Dhaka". Edit the list to change it.
export const INSIDE_DHAKA_EXTRA = ['Savar', 'Keraniganj'];
export const deliveryAreaFor = (district, zone, isCityThana) =>
  !district ? '' : (district === 'Dhaka' && (isCityThana || INSIDE_DHAKA_EXTRA.includes(zone)) ? 'Inside Dhaka' : 'Outside Dhaka');

// Delivery charge: 100 inside Dhaka, 150 outside Dhaka (default). The Owner can change them, and set a "free delivery"
// minimum, in Admin > Store Settings. These defaults are used until the Owner saves something.
// NOTE: firestore.rules checks the same rules (charge by area, free delivery) against settings/store.
export const DEFAULT_DELIVERY = { deliveryInside: 100, deliveryOutside: 150, deliveryExtraPerItem: 15, deliveryIncludedItems: 2, freeDeliveryEnabled: true, freeDeliveryMin: 2000, freeDeliveryFor: 'online' };
export const FREE_DELIVERY_FOR = ['online', 'cod', 'both'];

export const PAYMENT_METHODS = ['Cash on Delivery', 'Online Payment'];
export const PAYMENT_METHOD_BN = { 'Cash on Delivery': 'ক্যাশ অন ডেলিভারি', 'Online Payment': 'অনলাইন পেমেন্ট' };

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Free delivery applies when the product total (after discount) reaches the minimum AND the payment method matches
export const freeDeliveryApplies = (netTotal, method, settings) => {
  const s = normalizeSettings(settings);
  if (!s.freeDeliveryEnabled) return false;
  if (!(netTotal >= s.freeDeliveryMin)) return false;
  if (s.freeDeliveryFor === 'both') return true;
  return s.freeDeliveryFor === 'online' ? method === 'Online Payment' : method === 'Cash on Delivery';
};

// Delivery charge for the order. 0 until the customer has chosen the delivery area (checkout shows "Select city & zone").
// units = number of items in the cart (all quantities added). The area charge covers the first "deliveryIncludedItems"
// items (default 2); every item after that adds "deliveryExtraPerItem" (default 15), because the supplier charges extra per item.
export const deliveryFee = (area, method, netTotal, settings, units = 1) => {
  if (!area) return 0;
  const s = normalizeSettings(settings);
  if (freeDeliveryApplies(netTotal, method, s)) return 0;
  const base = area === 'Inside Dhaka' ? s.deliveryInside : s.deliveryOutside;
  return base + s.deliveryExtraPerItem * Math.max(0, (parseInt(units, 10) || 1) - s.deliveryIncludedItems);
};

// Short sentence about delivery for the cart / checkout (English + Bangla).
// units = items in the cart: the "+15 per extra item" sentence only shows when the cart has more items than the charge covers
// (leave units out to always show it, e.g. in the admin preview).
export const deliveryNote = (settings, units) => {
  const s = normalizeSettings(settings);
  const showExtra = s.deliveryExtraPerItem > 0 && (units === undefined || units > s.deliveryIncludedItems);
  const who = { online: ['with Online Payment', 'অনলাইন পেমেন্ট করলে'], cod: ['with Cash on Delivery', 'ক্যাশ অন ডেলিভারিতে'], both: ['on any payment method', 'যেকোনো পেমেন্টে'] }[s.freeDeliveryFor];
  return {
    en: `Delivery charge: ${s.deliveryInside} BDT inside Dhaka, ${s.deliveryOutside} BDT outside Dhaka${showExtra ? `, +${s.deliveryExtraPerItem} BDT for each item after the first ${s.deliveryIncludedItems}` : ''}.${s.freeDeliveryEnabled ? ` Free delivery ${who[0]} when your order is ${s.freeDeliveryMin} BDT or more.` : ''}`,
    bn: `ডেলিভারি চার্জ: ঢাকার ভিতরে ${toBanglaDigits(s.deliveryInside)} টাকা, ঢাকার বাইরে ${toBanglaDigits(s.deliveryOutside)} টাকা${showExtra ? `, প্রথম ${toBanglaDigits(s.deliveryIncludedItems)}টি পণ্যের পর প্রতিটি পণ্যে +${toBanglaDigits(s.deliveryExtraPerItem)} টাকা` : ''}।${s.freeDeliveryEnabled ? ` ${who[1]} ${toBanglaDigits(s.freeDeliveryMin)} টাকা বা তার বেশির অর্ডারে ডেলিভারি ফ্রি।` : ''}`,
  };
};

// How much more the customer must add to get free delivery (0 if not applicable / already free / wrong payment method)
export const freeDeliveryMissing = (netTotal, settings) => {
  const s = normalizeSettings(settings);
  return s.freeDeliveryEnabled && netTotal < s.freeDeliveryMin ? Math.ceil(s.freeDeliveryMin - netTotal) : 0;
};

export const paymentStatusFor = (method) =>
  method === 'Online Payment' ? 'Awaiting payment' : 'Cash on Delivery';

export const toBanglaDigits = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

// ---------------------------------------------------------------------------
// Store settings: banner text + automatic discount rules (editable by the Owner in the admin panel,
// stored in Firestore settings/store). These defaults are used until the Owner saves something.
// ---------------------------------------------------------------------------
export const DEFAULT_STORE_SETTINGS = {
  announcementText: 'Discover Your Signature Style | Shop 3500 BDT or more and get 20% OFF automatically',
  discountEnabled: true,
  discountRules: [{ min: 3500, type: 'percent', value: 20 }],
  ...DEFAULT_DELIVERY,
  maintenanceMode: false, // true = visitors see the "under maintenance" page; team members still see the real website
  maintenanceMessage: '',
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Cleans anything coming from Firestore / the admin form into a safe shape
export function normalizeSettings(raw) {
  const base = DEFAULT_STORE_SETTINGS;
  if (!raw || typeof raw !== 'object') {
    return { ...base, discountRules: base.discountRules.map((r) => ({ ...r })) };
  }
  const rules = (Array.isArray(raw.discountRules) ? raw.discountRules : [])
    .map((r) => ({
      min: Math.max(0, Math.round(num(r && r.min))),
      type: r && r.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, num(r && r.value)),
    }))
    .map((r) => (r.type === 'percent' ? { ...r, value: Math.min(100, r.value) } : { ...r, value: Math.round(r.value) }))
    .filter((r) => r.min > 0 && r.value > 0)
    .sort((a, b) => a.min - b.min)
    .slice(0, 10);
  return {
    announcementText: typeof raw.announcementText === 'string' ? raw.announcementText : base.announcementText,
    discountEnabled: raw.discountEnabled !== false,
    discountRules: rules,
    deliveryInside: raw.deliveryInside === undefined ? DEFAULT_DELIVERY.deliveryInside : Math.min(100000, Math.max(0, Math.round(num(raw.deliveryInside)))),
    deliveryExtraPerItem: raw.deliveryExtraPerItem === undefined ? DEFAULT_DELIVERY.deliveryExtraPerItem : Math.min(10000, Math.max(0, Math.round(num(raw.deliveryExtraPerItem)))),
    deliveryIncludedItems: raw.deliveryIncludedItems === undefined ? DEFAULT_DELIVERY.deliveryIncludedItems : Math.min(100, Math.max(1, Math.round(num(raw.deliveryIncludedItems)))),
    deliveryOutside: raw.deliveryOutside === undefined ? DEFAULT_DELIVERY.deliveryOutside : Math.min(100000, Math.max(0, Math.round(num(raw.deliveryOutside)))),
    freeDeliveryEnabled: raw.freeDeliveryEnabled === undefined ? DEFAULT_DELIVERY.freeDeliveryEnabled : raw.freeDeliveryEnabled === true,
    freeDeliveryMin: raw.freeDeliveryMin === undefined ? DEFAULT_DELIVERY.freeDeliveryMin : Math.min(10000000, Math.max(0, Math.round(num(raw.freeDeliveryMin)))),
    freeDeliveryFor: FREE_DELIVERY_FOR.includes(raw.freeDeliveryFor) ? raw.freeDeliveryFor : DEFAULT_DELIVERY.freeDeliveryFor,
    maintenanceMode: raw.maintenanceMode === true,
    maintenanceMessage: typeof raw.maintenanceMessage === 'string' ? raw.maintenanceMessage.slice(0, 300) : '',
  };
}

export const ruleAmount = (rule, subtotal) =>
  rule.type === 'percent' ? Math.floor((subtotal * rule.value) / 100) : Math.min(Math.round(rule.value), Math.floor(subtotal));

export const describeRule = (rule) =>
  `${rule.type === 'percent' ? `${rule.value}% OFF` : `৳${rule.value} OFF`} on ${rule.min} BDT or more`;

// Tiers: the highest minimum the cart has reached decides the discount (a higher tier REPLACES a lower one).
// Returns { amount, rule } (amount 0 when nothing applies)
export function bestDiscount(subtotal, settings) {
  const s = normalizeSettings(settings);
  if (!s.discountEnabled) return { amount: 0, rule: null };
  let rule = null;
  for (const r of s.discountRules) if (subtotal >= r.min) rule = r; // rules are sorted by min
  return rule ? { amount: ruleAmount(rule, subtotal), rule } : { amount: 0, rule: null };
}

// The next reward the customer can unlock, e.g. { rule, missing: 650 } (null if there is none)
export function nextReward(subtotal, settings) {
  const s = normalizeSettings(settings);
  if (!s.discountEnabled) return null;
  const current = bestDiscount(subtotal, s).amount;
  const next = s.discountRules.find((r) => r.min > subtotal && ruleAmount(r, r.min) > current);
  return next ? { rule: next, missing: Math.ceil(next.min - subtotal) } : null;
}

// Banner sentence built from the rules (English + Bangla), e.g.
// "Discover Your Signature Style | Spend 4000 BDT & get 20% OFF | Spend 5500 BDT or more & get 30% OFF | ..."
export function bannerFromRules(settings) {
  const s = normalizeSettings(settings);
  if (!s.discountEnabled || s.discountRules.length === 0) return 'Discover Your Signature Style';
  const rules = s.discountRules;
  const last = rules.length - 1;
  const en = rules.map((r, i) => {
    const off = r.type === 'percent' ? `${r.value}% OFF` : `৳${r.value} OFF`;
    return `Spend ${r.min} BDT${i === last ? ' or more' : ''} & get ${off}`;
  });
  const bn = rules.map((r, i) => {
    const off = r.type === 'percent' ? `${toBanglaDigits(r.value)}% ছাড়` : `${toBanglaDigits(r.value)} টাকা ছাড়`;
    return `${toBanglaDigits(r.min)} টাকা${i === last ? ' বা তার বেশি' : ''} কেনাকাটায় ${off}`;
  });
  return `Discover Your Signature Style | ${en.join(' | ')} | ${bn.join(' | ')}`;
}

// Highest values, stored next to the rules so Firestore rules can check an order's discount
export function discountLimits(settings) {
  const s = normalizeSettings(settings);
  if (!s.discountEnabled) return { maxPercent: 0, maxFixed: 0 };
  return {
    maxPercent: Math.max(0, ...s.discountRules.filter((r) => r.type === 'percent').map((r) => r.value)),
    maxFixed: Math.max(0, ...s.discountRules.filter((r) => r.type === 'fixed').map((r) => r.value)),
  };
}

// ---------------------------------------------------------------------------
// Blocking spam customers. A phone number is turned into a "key" so that +8801712345678, 8801712345678
// and 01712345678 are the same number. The SAME steps are done in firestore.rules (function phoneKey).
// ---------------------------------------------------------------------------
export const cleanPhone = (p) => String(p || '').replace(/[\s()-]/g, '');
export const phoneKey = (p) => cleanPhone(p).replace(/^[+]/, '').replace(/^880/, '0').replace(/^1/, '01');
export const emailKey = (e) => String(e || '').trim().toLowerCase();
