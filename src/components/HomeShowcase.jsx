import React, { useEffect, useMemo, useState } from 'react';
import { matchesCollectionPage, rankBySales, totalStock } from '../data/catalog';
import HangerRail from './HangerRail';
import ShoeOrbit from './ShoeOrbit';
import RailQuickView from './RailQuickView';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';
import { loadShowcase } from '../showcaseStore';

// Home page showcase (Classic theme), above "Shop by category":
// Men rail, Women rail, Bags / Watches / Wallets rail, then the Shoes wheel.
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
const cutoutsFor = (products, rail, uploaded) => {
  const inStock = (id) => products.find((x) => String(x.id) === String(id) && totalStock(x) > 0);
  const out = [];
  const seen = new Set();
  for (const c of CUTOUTS[rail] || []) {
    const p = inStock(c.id); const up = uploaded[c.id];
    if (!p || (up && up.off && !up.image)) continue;
    seen.add(c.id);
    out.push(up && up.image
      ? { ...p, cutout: up.image, cutoutHanger: !!up.hanger, cutoutColor: null, cutoutExtra: up.extra || [] }
      : { ...p, cutout: cutoutSrc(c.id), cutoutHanger: !!c.hanger, cutoutColor: c.color || null });
  }
  const extra = rankBySales(products.filter((p) => !seen.has(String(p.id)) && totalStock(p) > 0 && railOf(p) === rail
    && uploaded[String(p.id)] && uploaded[String(p.id)].image));
  for (const p of extra) { const up = uploaded[String(p.id)]; out.push({ ...p, cutout: up.image, cutoutHanger: !!up.hanger, cutoutColor: null, cutoutExtra: up.extra || [] }); }
  return out.slice(0, CUT_LIMIT);
};

const ACCESSORIES = [
  { key: 'Bags', label: 'Bags', pick: inPage('Women', 'Bags'), open: ['Women', 'Bags'] },
  { key: 'Watches', label: 'Watches', pick: isKind('Watches'), open: ['Watches'] },
  { key: 'Wallets', label: 'Wallets', pick: isKind('Wallets'), open: ['Wallets'] },
];

export default function HomeShowcase({ products, formatPrice, addToCart, openProduct, openCollection }) {
  const [uploaded, setUploaded] = useState({});
  useEffect(() => { loadShowcase().then(setUploaded).catch(() => {}); }, []);
  const menCut = useMemo(() => cutoutsFor(products, 'men', uploaded), [products, uploaded]);
  const womenCut = useMemo(() => cutoutsFor(products, 'women', uploaded), [products, uploaded]);
  const shoesCut = useMemo(() => cutoutsFor(products, 'shoes', uploaded), [products, uploaded]);
  const menMix = useMemo(() => mix(products, [inPage('Men', 'Shirt'), inPage('Men', 'T-Shirt'), inPage('Men', 'Jacket'), inPage('Men', 'Polo'), inPage('Men', 'Formal Shirt')]), [products]);
  const men = menCut.length >= MIN_CUT ? menCut : menMix;
  const womenMix = useMemo(() => mix(products, [inPage('Women', 'Saree'), inPage('Women', 'Three Piece'), inPage('Women', 'Ladies Jacket'), inPage('Women', 'Tops')]), [products]);
  const women = womenCut.length >= MIN_CUT ? womenCut : womenMix;
  const accTabs = useMemo(() => ACCESSORIES.map((t) => ({ ...t, items: mix(products, [t.pick]) })).filter((t) => t.items.length >= MIN), [products]);
  const shoesMix = useMemo(() => mix(products, [isKind('Shoes')], 12), [products]);
  const shoes = shoesCut.length >= MIN_CUT ? shoesCut : shoesMix;

  const [accKey, setAccKey] = useState(null);
  const acc = accTabs.find((t) => t.key === accKey) || accTabs[0];
  const [view, setView] = useState(null); // { items, index, hanging }

  const open = (items, hanging = true) => (index) => setView({ items, index, hanging });

  return (
    <>
      {men.length >= MIN && (
        <HangerRail title="Men's Collection" products={men} formatPrice={formatPrice} onOpen={open(men)} onShopAll={() => openCollection('Men')}
          tagline={['Shirts, tees and jackets.', 'Picked for everyday style.']} variant="curve" tone="grey" />
      )}
      {women.length >= MIN && (
        <HangerRail title="Women's Collection" products={women} formatPrice={formatPrice} onOpen={open(women)} onShopAll={() => openCollection('Women')}
          tagline={['Saree, three piece and more.', 'Made to stand out.']} variant="straight" tone="white" />
      )}
      {acc && (
        <HangerRail label="FINISH THE LOOK" title="Accessories" products={acc.items} formatPrice={formatPrice} onOpen={open(acc.items)}
          onShopAll={() => openCollection(...acc.open)} tagline={['Bags, watches and wallets.', 'The last detail counts.']}
          variant="straight" tone="blue" card="square" tabs={accTabs.length > 1 ? accTabs : null} activeTab={acc.key} onTab={setAccKey} />
      )}
      {shoes.length >= MIN && (
        <ShoeOrbit products={shoes} formatPrice={formatPrice} onOpen={open(shoes, false)} addToCart={addToCart} onShopAll={() => openCollection('Shoes')} />
      )}

      {view && (
        <RailQuickView items={view.items} index={view.index} hanging={view.hanging} setIndex={(i) => setView((v) => ({ ...v, index: i }))}
          onClose={() => setView(null)} formatPrice={formatPrice} addToCart={addToCart} openProduct={openProduct} />
      )}
    </>
  );
}
