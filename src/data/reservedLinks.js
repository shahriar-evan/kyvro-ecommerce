// Shop links live at the root (kyvro.store/<link>), so a shop link can never be one of the site's own routes or a
// name we may need later. Add a word here when a new page or route is added.
// NOTE: firestore.rules repeats this list (in the shopHandles create rule). Change both together.
export const RESERVED_LINKS = [
  'admin', 'api', 's', 'shop', 'shops',
  'men', 'mens', 'women', 'womens', 'winter', 'shoes', 'wallets', 'watches',
  'cart', 'checkout', 'account', 'orders', 'order-tracking', 'wallet',
  'sell', 'seller', 'sellers', 'plans', 'pricing',
  'login', 'signup', 'about', 'contact', 'terms', 'privacy', 'help', 'support',
  'kyvro', 'official', 'owner', 'www', 'static', 'assets',
];
export const isReservedLink = (link) => RESERVED_LINKS.includes(String(link || '').toLowerCase());

// a path segment that can be a shop link or a shop id (kyvro.store/rahim-fashion); same shape as the vercel.json rewrite
export const ROOT_LINK_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
