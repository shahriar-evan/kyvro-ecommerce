// ---------------------------------------------------------------------------
// Delivery + payment settings (amounts are in BDT)
// NOTE: the same delivery charges are checked in firestore.rules. If you change a charge
// here, change it in the rules too, otherwise new orders will be rejected.
// ---------------------------------------------------------------------------

// WhatsApp number for "Order on WhatsApp" (country code + number, no + or spaces). Change it here once.
export const WHATSAPP_NUMBER = '60123456789';

export const DELIVERY_AREAS = ['Inside Dhaka', 'Outside Dhaka'];
export const DELIVERY_AREA_BN = { 'Inside Dhaka': 'ঢাকার ভিতরে', 'Outside Dhaka': 'ঢাকার বাইরে' };

// Delivery charge, charged only for Cash on Delivery
export const DELIVERY_CHARGES = { 'Inside Dhaka': 100, 'Outside Dhaka': 150 };

export const PAYMENT_METHODS = ['Cash on Delivery', 'Online Payment'];
export const PAYMENT_METHOD_BN = { 'Cash on Delivery': 'ক্যাশ অন ডেলিভারি', 'Online Payment': 'অনলাইন পেমেন্ট' };

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Online Payment = free delivery. Cash on Delivery = charge by area.
export const deliveryFee = (area, method) =>
  method === 'Online Payment' ? 0 : (DELIVERY_CHARGES[area] || 0);

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

// Banner sentence built from the rules, e.g. "Shop 3500 BDT or more and get 20% OFF automatically"
export function bannerFromRules(settings) {
  const s = normalizeSettings(settings);
  if (!s.discountEnabled || s.discountRules.length === 0) return 'Discover Your Signature Style';
  const parts = s.discountRules.map((r) => `${r.min} BDT = ${r.type === 'percent' ? `${r.value}%` : `৳${r.value}`} OFF`);
  return `Discover Your Signature Style | Automatic discount: ${parts.join(', ')}`;
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
