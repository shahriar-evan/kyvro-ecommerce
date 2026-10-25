// ---------------------------------------------------------------------------
// Collections, sub-categories and stock helpers (shared by the shop and admin)
// ---------------------------------------------------------------------------

export const COLLECTION_LABELS = {
  Men: "Men's Collection",
  Women: "Women's Collection",
  Shoes: 'Shoes',
  Wallets: 'Wallets',
  Watches: 'Watches',
};

// Sub-categories. A plain item has { name }, a group has { group, items: [...] }.
export const SUB_CATEGORIES = {
  Men: [
    { name: 'Shirt' },
    { name: 'Punjabi' },
    { name: 'Polo' },
    { name: 'T-Shirt' },
    { name: 'Joggers & Sweats' },
    { name: 'Jersey' },
  ],
  Women: [
    { name: 'Sharee' },
    { name: 'Bags' },
    { name: 'Watches' },
    { group: 'Western Wear', items: ['Night Dress', 'Tops', 'T-Shirt'] },
    { group: 'Muslim Wear', items: ['Borkha', 'Hijab'] },
  ],
};

// What a customer sees when they open the collection without choosing a sub-category
export const DEFAULT_SUBS = {
  Men: ['Shirt', 'Punjabi'],
  Women: ['Sharee'],
};
export const DEFAULT_SUB_LABEL = { Men: 'Shirt & Punjabi', Women: 'Sharee' };

export const hasSubCategories = (gender) => gender === 'Men' || gender === 'Women';

// Every selectable category name of a collection (groups are expanded)
export const flatSubCategories = (gender) =>
  (SUB_CATEGORIES[gender] || []).flatMap((s) => (s.group ? s.items : [s.name]));

export const defaultCategoryFor = (gender) =>
  hasSubCategories(gender) ? flatSubCategories(gender)[0] : gender;

// "Western Wear" -> ['Night Dress','Tops','T-Shirt'], "Polo" -> ['Polo']
export const subCategoryNames = (gender, sub) => {
  const group = (SUB_CATEGORIES[gender] || []).find((s) => s.group && s.group.toLowerCase() === String(sub).toLowerCase());
  return group ? group.items : [sub];
};

const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// Does a product belong to the Men/Women page the customer is looking at?
export const matchesCollectionPage = (product, collection, sub) => {
  if (!same(product.gender, collection)) return false;
  const wanted = sub ? subCategoryNames(collection, sub) : DEFAULT_SUBS[collection];
  return wanted.some((n) => same(n, product.category));
};

// ---- Sizes & stock ---------------------------------------------------------

export const SIZE_PRESETS = {
  clothing: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  womenExtra: ['Free Size'],
  shoes: ['38', '39', '40', '41', '42', '43', '44', '45'],
};

export const sizePresetsFor = (gender) => {
  if (gender === 'Shoes') return SIZE_PRESETS.shoes;
  if (gender === 'Men') return SIZE_PRESETS.clothing;
  if (gender === 'Women') return [...SIZE_PRESETS.clothing, ...SIZE_PRESETS.womenExtra];
  return [];
};

// Product has per-size stock (e.g. { M: 20, XL: 10, L: 15 })
export const hasSizeStock = (p) => !!p && !!p.sizeStock && Object.keys(p.sizeStock).length > 0;

export const totalStock = (p) =>
  hasSizeStock(p)
    ? Object.values(p.sizeStock).reduce((sum, n) => sum + (parseInt(n, 10) || 0), 0)
    : parseInt(p?.stock, 10) || 0;

export const stockForSize = (p, size) =>
  hasSizeStock(p) ? parseInt(p.sizeStock[size], 10) || 0 : parseInt(p?.stock, 10) || 0;

// Sizes in a sensible order (S, M, L ... then anything custom)
export const orderedSizes = (sizes, gender) => {
  const order = [...SIZE_PRESETS.clothing, ...SIZE_PRESETS.womenExtra, ...SIZE_PRESETS.shoes];
  return [...sizes].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
};
