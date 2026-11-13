import React, { useEffect, useMemo, useState } from 'react';
import { matchesCollectionPage, rankBySales, totalStock, flatSubCategories, subLabel } from '../data/catalog';
import { isFoldedPhoto } from '../data/photoShape';
import HangerRail from './HangerRail';
import ShoeOrbit from './ShoeOrbit';
import RailQuickView from './RailQuickView';
import ShopTheLook from './ShopTheLook';
import { CUTOUTS, cutoutSrc, cutoutSideSrc } from '../data/cutouts';
import { loadShowcase, showcaseNow } from '../showcaseStore';

// start reading the uploaded photos as soon as the app loads (the rails wait for them)
loadShowcase().catch(() => {});

// The uploaded background-free photos decide which pieces hang and in what order (pins, hidden built-ins), so the
// rails wait for them instead of showing the built-in set first and then jumping (null = still loading; 5 s at most).
const EMPTY = {};
export function useShowcase() {
  const [data, setData] = useState(() => showcaseNow());
  useEffect(() => {
    if (data) return undefined;
    let live = true;
    const t = setTimeout(() => { if (live) setData((x) => x || {}); }, 5000);
    loadShowcase().then((d) => { if (live) setData(d); }).catch(() => { if (live) setData((x) => x || {}); });
    return () => { live = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}

// Home page showcase (Classic theme), above "Shop by category":
// Men rail, Shop the Look, the Shoes wheel, Women rail, then Bags / Watches / Wallets.
// Each rail shows a mix of the best sellers of its categories (not every product).
const LIMIT = 14;
const MIN = 3; // a rail with fewer products is not shown

const isKind = (name) => (p) => p.gender === name || p.category === name;
const inPage = (col, sub) => (p) => matchesCollectionPage(p, col, sub);

// best sellers of each group, taken in turn (shirt, t-shirt, jacket, shirt, ...)
const mix = (products, groups, limit = LIMIT) => {
  const lists = groups.map((g) => rankBySales(products.filter((p) => totalStock(p) > 0 && g(p))));
  const out = [];
  const seen = new Set();
  for (let r = 0; out.length < limit && lists.some((l) => l.length > r); r += 1) {
    for (const l of lists) {
      const p = l[r];
      if (p && !seen.has(p.id) && out.length < limit) { seen.add(p.id); out.push(p); }
    }
  }
  return out;
};

// Background-free pictures: the built-in ones (src/data/cutouts.js, in that order) and the ones uploaded in the
// Admin product form (Firestore "showcase"; an upload replaces the built-in picture, "off" hides it).
const MIN_CUT = 4; // a rail switches to background-free pictures from this many
const CUT_LIMIT = 18;
const railOf = (p) => {
  if (p.gender === 'Shoes' || p.category === 'Shoes') return 'shoes';
  if (p.gender === 'Women' && p.category !== 'Bags') return 'women';
  if (p.category === 'Ladies Jacket') return 'women';
  if (p.gender === 'Men' || p.gender === 'Winter' || p.gender === 'Jackets') return 'men';
  return null;
};
// 📌 pinned products (Admin "Pin first", showcase/{id}.pin) come first by their position; the rest keep their order
const pinOf = (p, uploaded) => Number((uploaded[String(p.id)] || {}).pin) || 0;
const byPin = (list, uploaded) => list.map((p, i) => [p, i]).sort(([a, i], [b, j]) => {
  const pa = pinOf(a, uploaded) || 1000;
  const pb = pinOf(b, uploaded) || 1000;
  return (pa - pb) || (i - j);
}).map(([p]) => p);
const cutoutsFor = (products, rail, uploaded) => {
  const inStock = (id) => products.find((x) => String(x.id) === String(id) && totalStock(x) > 0);
  const out = [];
  const seen = new Set();
  for (const c of CUTOUTS[rail] || []) {
    const p = inStock(c.id); const up = uploaded[c.id];
    if (!p || (up && up.off && !up.image)) continue;
    seen.add(c.id);
    out.push(up && up.image
      ? { ...p, cutout: up.image, cutoutHanger: !!up.hanger, cutoutColor: null, cutoutExtra: up.extra || [], cutoutSide: up.side || null }
      : { ...p, cutout: cutoutSrc(c.id), cutoutHanger: !!c.hanger, cutoutColor: c.color || null, cutoutSide: c.side ? cutoutSideSrc(c.id) : null });
  }
  const extra = rankBySales(products.filter((p) => !seen.has(String(p.id)) && totalStock(p) > 0 && railOf(p) === rail
    && uploaded[String(p.id)] && uploaded[String(p.id)].image));
  for (const p of extra) { const up = uploaded[String(p.id)]; out.push({ ...p, cutout: up.image, cutoutHanger: !!up.hanger, cutoutColor: null, cutoutExtra: up.extra || [], cutoutSide: up.side || null }); }
  return byPin(out, uploaded).slice(0, CUT_LIMIT);
};

const ACCESSORIES = [
  { key: 'Bags', label: 'Bags', pick: inPage('Women', 'Bags'), open: ['Women', 'Bags'] },
  { key: 'Watches', label: 'Watches', pick: isKind('Watches'), open: ['Watches'] },
  { key: 'Wallets', label: 'Wallets', pick: isKind('Wallets'), open: ['Wallets'] },
];

// one section of a collection (e.g. Men > T-Shirt): every in-stock product of it, best sellers first;
// the ones with a background-free picture hang first, folded shirt photos last
const withCutout = (p, uploaded) => {
  const id = String(p.id);
  const up = uploaded[id];
  if (up && up.image) return { ...p, cutout: up.image, cutoutHanger: !!up.hanger, cutoutColor: null, cutoutExtra: up.extra || [], cutoutSide: up.side || null };
  const c = [...CUTOUTS.men, ...CUTOUTS.shoes].find((x) => x.id === id);
  if (c && !(up && up.off)) return { ...p, cutout: cutoutSrc(id), cutoutHanger: !!c.hanger, cutoutColor: c.color || null, cutoutSide: c.side ? cutoutSideSrc(id) : null };
  return p;
};
const sectionItems = (products, col, sub, uploaded) => rankBySales(products.filter((p) => totalStock(p) > 0 && matchesCollectionPage(p, col, sub)))
  .map((p) => withCutout(p, uploaded))
  .sort((a, b) => ((pinOf(a, uploaded) || 1000) - (pinOf(b, uploaded) || 1000))
    || (Number(!a.cutout) - Number(!b.cutout)) || (Number(isFoldedPhoto(a)) - Number(isFoldedPhoto(b))))
  .slice(0, CUT_LIMIT);
// the sections of a collection that have products, for the picker next to the title
const sectionsOf = (products, col, skip = []) => flatSubCategories(col).filter((n) => !skip.includes(n)).map((n) => ({
  key: n, label: subLabel(n), count: products.filter((p) => totalStock(p) > 0 && matchesCollectionPage(p, col, n)).length,
})).filter((x) => x.count > 0);

const MEN_GROUPS = [inPage('Men', 'Shirt'), inPage('Men', 'T-Shirt'), inPage('Men', 'Jacket'), inPage('Men', 'Polo'), inPage('Men', 'Formal Shirt')];
const WOMEN_GROUPS = [inPage('Women', 'Saree'), inPage('Women', 'Three Piece'), inPage('Women', 'Ladies Jacket'), inPage('Women', 'Tops')];

// The pieces a Men / Women rail shows (home page and the top of that collection's page): a section = its products
// (background-free first, pinned first); no section = the background-free pieces (pinned first), else a best-seller mix.
export const collectionRailItems = (products, col, sub, uploaded) => {
  if (sub) return sectionItems(products, col, sub, uploaded);
  if (col === 'Men') { const cut = cutoutsFor(products, 'men', uploaded); return cut.length >= MIN_CUT ? cut : mix(products, MEN_GROUPS); }
  if (col === 'Women') { const cut = cutoutsFor(products, 'women', uploaded); return cut.length >= MIN_CUT ? cut : mix(products, WOMEN_GROUPS); }
  return [];
};

// The same hanging rail at the top of the Men / Women collection page (ShopView); the page lists the rest below.
// onItems(ids) tells the page which products hang here, so its grid lists them last.
export function CollectionRail({ products, collection, sub, formatPrice, addToCart, openProduct, onItems, onSeeAll }) {
  const showcase = useShowcase();
  const uploaded = showcase || EMPTY;
  const items = useMemo(() => collectionRailItems(products, collection, sub, uploaded), [products, collection, sub, uploaded]);
  const show = items.length >= MIN;
  const key = show ? items.map((p) => p.id).join(',') : '';
  useEffect(() => { if (onItems) onItems(key ? key.split(',') : []); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(null);
  if (!showcase) return <section aria-hidden="true" className="w-full h-[560px] sm:h-[640px]" style={{ background: collection === 'Women' ? '#ffffff' : '#f1f1f0' }} />;
  if (!show) return null;
  const women = collection === 'Women';
  return (
    <>
      <HangerRail title={women ? "Women's Collection" : "Men's Collection"} products={items} formatPrice={formatPrice}
        onOpen={(index) => setView({ index })} onShopAll={onSeeAll} full={false}
        tagline={women ? ['Saree, three piece and more.', 'Made to stand out.'] : ['Shirts, tees and jackets.', 'Picked for everyday style.']}
        variant="curve" tone={women ? 'white' : 'grey'} />
      {view && (
        <RailQuickView items={items} index={view.index} hanging setIndex={(i) => setView({ index: i })}
          onClose={() => setView(null)} formatPrice={formatPrice} addToCart={addToCart} openProduct={openProduct} />
      )}
    </>
  );
}

export default function HomeShowcase({ products, formatPrice, addToCart, openProduct, openCollection }) {
  const showcase = useShowcase();
  const uploaded = showcase || EMPTY;
  const menCut = useMemo(() => cutoutsFor(products, 'men', uploaded), [products, uploaded]);
  const womenCut = useMemo(() => cutoutsFor(products, 'women', uploaded), [products, uploaded]);
  const shoesCut = useMemo(() => cutoutsFor(products, 'shoes', uploaded), [products, uploaded]);
  const menMix = useMemo(() => mix(products, MEN_GROUPS), [products]);
  const men = menCut.length >= MIN_CUT ? menCut : menMix;
  const womenMix = useMemo(() => mix(products, WOMEN_GROUPS), [products]);
  const women = womenCut.length >= MIN_CUT ? womenCut : womenMix;
  // section picker (Men > T-Shirt, Women > Saree ...)
  const [menSub, setMenSub] = useState(null);
  const [womenSub, setWomenSub] = useState(null);
  const menSections = useMemo(() => sectionsOf(products, 'Men'), [products]);
  const womenSections = useMemo(() => sectionsOf(products, 'Women', ['Bags']), [products]);
  const menShown = useMemo(() => (menSub ? sectionItems(products, 'Men', menSub, uploaded) : men), [menSub, products, uploaded, men]);
  const womenShown = useMemo(() => (womenSub ? sectionItems(products, 'Women', womenSub, uploaded) : women), [womenSub, products, uploaded, women]);
  const accTabs = useMemo(() => ACCESSORIES.map((t) => ({ ...t, items: mix(products, [t.pick]) })).filter((t) => t.items.length >= MIN), [products]);
  const shoesMix = useMemo(() => mix(products, [isKind('Shoes')], 12), [products]);
  const shoes = shoesCut.length >= MIN_CUT ? shoesCut : shoesMix;

  const [accKey, setAccKey] = useState(null);
  const acc = accTabs.find((t) => t.key === accKey) || accTabs[0];
  const [view, setView] = useState(null); // { items, index, hanging }

  const open = (items, hanging = true) => (index) => setView({ items, index, hanging });

  // first visit: keep the rail's place (same grey) until the uploaded photos are in, so nothing swaps in front of the visitor
  if (!showcase) return <section aria-hidden="true" className="w-full h-[640px] sm:h-[720px] lg:h-[calc(100vh-72px)]" style={{ background: '#f1f1f0' }} />;

  return (
    <>
      {men.length >= MIN && (
        <HangerRail title="Men's Collection" products={menShown} formatPrice={formatPrice} onOpen={open(menShown)} onShopAll={() => openCollection('Men', menSub)}
          tagline={['Shirts, tees and jackets.', 'Picked for everyday style.']} variant="curve" tone="grey"
          filters={menSections} filter={menSub} onFilter={setMenSub} />
      )}
      <ShopTheLook products={products} formatPrice={formatPrice} addToCart={addToCart} openProduct={openProduct} />
      {/* the shoes wheel right after the looks (finish the outfit), then Women and Accessories */}
      {shoes.length >= MIN && (
        <ShoeOrbit products={shoes} formatPrice={formatPrice} onOpen={open(shoes, false)} addToCart={addToCart} onShopAll={() => openCollection('Shoes')} />
      )}
      {women.length >= MIN && (
        <HangerRail title="Women's Collection" products={womenShown} formatPrice={formatPrice} onOpen={open(womenShown)} onShopAll={() => openCollection('Women', womenSub)}
          tagline={['Saree, three piece and more.', 'Made to stand out.']} variant="curve" tone="white"
          filters={womenSections} filter={womenSub} onFilter={setWomenSub} />
      )}
      {acc && (
        <HangerRail label="FINISH THE LOOK" title="Accessories" products={acc.items} formatPrice={formatPrice} onOpen={open(acc.items)}
          onShopAll={() => openCollection(...acc.open)} tagline={['Bags, watches and wallets.', 'The last detail counts.']}
          variant="curve" tone="blue" card="square" tabs={accTabs.length > 1 ? accTabs : null} activeTab={acc.key} onTab={setAccKey} />
      )}

      {view && (
        <RailQuickView items={view.items} index={view.index} hanging={view.hanging} setIndex={(i) => setView((v) => ({ ...v, index: i }))}
          onClose={() => setView(null)} formatPrice={formatPrice} addToCart={addToCart} openProduct={openProduct} />
      )}
    </>
  );
}
