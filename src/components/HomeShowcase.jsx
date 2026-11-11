import React, { useMemo, useState } from 'react';
import { matchesCollectionPage, rankBySales, totalStock } from '../data/catalog';
import HangerRail from './HangerRail';
import ShoeOrbit from './ShoeOrbit';
import RailQuickView from './RailQuickView';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';

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

// the hand-picked products whose photo has no background (src/data/cutouts.js), in that order
const fromCutouts = (products, list) => list.map((c) => {
  const p = products.find((x) => String(x.id) === c.id);
  return p && totalStock(p) > 0 ? { ...p, cutout: cutoutSrc(c.id), cutoutHanger: !!c.hanger, cutoutColor: c.color || null } : null;
}).filter(Boolean);

const ACCESSORIES = [
  { key: 'Bags', label: 'Bags', pick: inPage('Women', 'Bags'), open: ['Women', 'Bags'] },
  { key: 'Watches', label: 'Watches', pick: isKind('Watches'), open: ['Watches'] },
  { key: 'Wallets', label: 'Wallets', pick: isKind('Wallets'), open: ['Wallets'] },
];

export default function HomeShowcase({ products, formatPrice, addToCart, openProduct, openCollection }) {
  const menCut = useMemo(() => fromCutouts(products, CUTOUTS.men), [products]);
  const shoesCut = useMemo(() => fromCutouts(products, CUTOUTS.shoes), [products]);
  const menMix = useMemo(() => mix(products, [inPage('Men', 'Shirt'), inPage('Men', 'T-Shirt'), inPage('Men', 'Jacket'), inPage('Men', 'Polo'), inPage('Men', 'Formal Shirt')]), [products]);
  const men = menCut.length >= 6 ? menCut : menMix;
  const women = useMemo(() => mix(products, [inPage('Women', 'Saree'), inPage('Women', 'Three Piece'), inPage('Women', 'Ladies Jacket'), inPage('Women', 'Tops')]), [products]);
  const accTabs = useMemo(() => ACCESSORIES.map((t) => ({ ...t, items: mix(products, [t.pick]) })).filter((t) => t.items.length >= MIN), [products]);
  const shoesMix = useMemo(() => mix(products, [isKind('Shoes')], 12), [products]);
  const shoes = shoesCut.length >= 6 ? shoesCut : shoesMix;

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
