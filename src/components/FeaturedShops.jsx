import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { watchAllShops, shopLinkKey } from '../shops';
import { effectiveTier, shopIsPaid, basicDue } from '../data/priceCheck';
import { effectiveFeatures, shopDisplayName, brandHex, shopExtrasOf } from '../data/shopBrand';

// Main site home: "Featured shops" = live shops whose plan has "Featured on Kyvro" (Premium, or switched on by the
// Owner / a Manager). Each card shows the shop's logo or first letter, its name and three of its products, and opens
// the shop link. The Owner's own shop (planExempt) is not listed. Shown only when at least one shop qualifies.
export default function FeaturedShops({ plans, products, isDarkMode, formatPrice }) {
  const [shops, setShops] = useState([]);
  useEffect(() => watchAllShops(setShops, () => setShops([])), []);
  const byId = useMemo(() => Object.fromEntries((products || []).map((p) => [String(p.id), p])), [products]);

  const featured = useMemo(() => shops.filter((s) => {
    if (!s || s.planExempt || s.active === false || s.status === 'pending' || s.killed) return false;
    if ((s.extra && !shopIsPaid(s)) || basicDue(s, plans)) return false;
    const key = shopLinkKey(s);
    if (!key) return false;
    return !!effectiveFeatures(s, effectiveTier(s), plans && plans.tierFeatures).featured;
  }).map((s) => {
    const items = Object.keys(s.items || {}).map((id) => byId[id]).filter((p) => p && (p.status || 'approved') === 'approved');
    return { shop: s, items };
  }).filter((x) => x.items.length > 0).slice(0, 8), [shops, plans, byId]);

  if (!featured.length) return null;
  return (
    <section className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">From our sellers</span>
          <h2 className="text-xl sm:text-3xl font-serif font-bold tracking-wider mt-1">FEATURED SHOPS</h2>
          <div className="w-12 h-0.5 bg-[#D4AF37] mx-auto mt-3" />
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {featured.map(({ shop, items }) => {
            const f = effectiveFeatures(shop, effectiveTier(shop), plans && plans.tierFeatures);
            const accent = f.brandColor ? brandHex(shopExtrasOf(shop).brandColor) : '#D4AF37';
            const name = shopDisplayName(shop, f);
            const url = `/${shopLinkKey(shop)}`;
            return (
              <a key={shop.slug} href={url}
                className={`group w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-4.5rem)/4)] rounded-2xl border overflow-hidden transition hover:-translate-y-1 hover:shadow-xl ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="grid grid-cols-3 gap-0.5 bg-gray-200/40">
                  {items.slice(0, 3).map((p) => (
                    <div key={p.id} className="aspect-square overflow-hidden">
                      {p.image && <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />}
                    </div>
                  ))}
                </div>
                <div className="p-4 flex items-center gap-3">
                  {f.logo && shop.logo
                    ? <img src={shop.logo} alt="" className="h-11 w-11 rounded-full object-cover border" style={{ borderColor: accent }} />
                    : <span className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-lg font-bold text-black" style={{ background: accent }}>{String(name || '?').charAt(0).toUpperCase()}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate flex items-center gap-1">{name}{f.verified && <BadgeCheck size={15} style={{ color: accent }} aria-label="Verified" />}</p>
                    <p className="text-[11px] text-gray-500 truncate">{items.length} products · from {formatPrice(Math.min(...items.map((p) => Number(shop.items[String(p.id)]) || Number(p.price) || 0)))}</p>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-gray-400 group-hover:text-[#D4AF37] transition" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
