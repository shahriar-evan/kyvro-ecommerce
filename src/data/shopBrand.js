// Shop page extras (Pro / Premium): brand color presets, link checks and the contact link.
// The same limits are checked in firestore.rules (shopExtrasOk).

// Premium: one accent color for the shop (wordmark, buttons, badges). '' = Kyvro gold.
export const BRAND_COLORS = [
  { key: 'gold', label: 'Gold', hex: '#D4AF37' },
  { key: 'blue', label: 'Blue', hex: '#2563EB' },
  { key: 'green', label: 'Green', hex: '#16A34A' },
  { key: 'red', label: 'Red', hex: '#DC2626' },
  { key: 'purple', label: 'Purple', hex: '#7C3AED' },
  { key: 'teal', label: 'Teal', hex: '#0D9488' },
];
export const brandHex = (key) => (BRAND_COLORS.find((c) => c.key === key) || BRAND_COLORS[0]).hex;

export const SOCIALS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourname' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourname' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
];

// only https:// links (no javascript:, data:, http: or spaces); '' = not set
export const httpsLinkOk = (v) => v === '' || (/^https:\/\/[^ <>"]+$/.test(v) && v.length <= 200);
// contact: a WhatsApp number (01..., +880...) or an https link
export const contactOk = (v) => v === '' || httpsLinkOk(v) || /^\+?[0-9]{8,15}$/.test(v);
export const cleanContact = (v) => { const t = String(v || '').trim(); return /^https:/.test(t) ? t : t.replace(/[\s()-]/g, ''); };
export const contactHref = (v) => (/^https:\/\//.test(v) ? v : `https://wa.me/${String(v).replace(/^\+/, '').replace(/^0/, '880')}`);
export const contactLabel = (v) => (/^https:\/\//.test(v) ? (/facebook\.com|fb\.com|m\.me/i.test(v) ? 'Facebook' : 'Contact') : 'WhatsApp');

// the extras as saved on a shop, with defaults
export const shopExtrasOf = (shop) => {
  const s = shop || {};
  const sl = s.socialLinks || {};
  return {
    tagline: s.tagline || '',
    contactUrl: s.contactUrl || '',
    about: s.about || '',
    socialLinks: { facebook: sl.facebook || '', instagram: sl.instagram || '', tiktok: sl.tiktok || '', youtube: sl.youtube || '' },
    brandColor: s.brandColor || '',
    announcement: s.announcement || '',
    pinnedItems: Array.isArray(s.pinnedItems) ? s.pinnedItems.slice(0, 3).map(String) : [],
  };
};
export const PRO_EXTRAS = ['tagline', 'contactUrl', 'about', 'socialLinks'];
export const PREMIUM_EXTRAS = ['brandColor', 'announcement', 'pinnedItems'];

// The name shown on a shop's page: the shop name with "Shop name change" on (Premium), else the shop link name.
export const shopDisplayName = (shop, feat) => (!shop ? '' : (feat && feat.shopName && shop.name) ? shop.name : (shop.handle || shop.name || ''));

// ---- Plan features: what each tier gets by default; the Owner / a Manager can switch any of them ON or OFF for a
// shop (shops/{slug}.features). firestore.rules uses the same defaults (featOn).
// paid: true = shop identity (name change, logo, banner): never on Free (even with an override; rules: paidFeatOn).
// Name change, logo and banner: Premium ON (uploads wait for Kyvro's approval); Pro OFF unless switched on.
// Pro by default: all products, priority approval, social links and the share kit. The rest is Premium. The shop link (slug) never changes. ----
export const FEATURES = [
  { key: 'allProducts', label: 'All products', pro: true },
  { key: 'priorityApproval', label: 'Priority approval', pro: true },
  { key: 'tagline', label: 'Tagline + contact button', pro: false },
  { key: 'social', label: 'Social links', pro: true },
  { key: 'about', label: 'About section', pro: false },
  { key: 'shareKit', label: 'Share kit (QR + caption)', pro: true },
  { key: 'brandColor', label: 'Brand color', pro: false },
  { key: 'announcement', label: 'Announcement strip', pro: false },
  { key: 'pinned', label: 'Pinned products', pro: false },
  { key: 'verified', label: 'Verified badge', pro: false },
  { key: 'weeklyPayout', label: 'Weekly payout', pro: false },
  { key: 'prioritySupport', label: 'Priority support', pro: false },
  { key: 'shopName', label: 'Shop name change', pro: false, paid: true },
  { key: 'logo', label: 'Logo upload', pro: false, paid: true },
  { key: 'banner', label: 'Banner upload', pro: false, paid: true },
  { key: 'salesStats', label: 'Sales stats', pro: false },
  { key: 'earningsCsv', label: 'Monthly earnings CSV', pro: false },
];
// the built-in default of a tier (used when the Owner did not switch the feature for that plan)
export const builtInDefault = (key, tier) => tier === 'premium' || (tier === 'pro' && !!(FEATURES.find((f) => f.key === key) || {}).pro);
// tierFeatures = settings/plans.tierFeatures (normalizePlans), the Owner's per-plan switches
export const featureDefault = (key, tier, tierFeatures) => {
  const m = (tierFeatures && tierFeatures[tier]) || {};
  return typeof m[key] === 'boolean' ? m[key] : builtInDefault(key, tier);
};
// a paid-only feature is always off on the Free plan, whatever the override says
export const featureLockedFree = (key, tier) => tier === 'free' && !!(FEATURES.find((f) => f.key === key) || {}).paid;
// { key: true/false } for a shop: override first, else the tier default. tier = 'free' | 'pro' | 'premium'.
export const effectiveFeatures = (shop, tier, tierFeatures) => {
  const o = (shop && shop.features) || {};
  return Object.fromEntries(FEATURES.map((f) => [f.key, featureLockedFree(f.key, tier) ? false : typeof o[f.key] === 'boolean' ? o[f.key] : featureDefault(f.key, tier, tierFeatures)]));
};
