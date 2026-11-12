import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';
import { useShowcase } from './HomeShowcase';
import { totalStock } from '../data/catalog';

// Shoes collection page: every pair stands on its own small wall shelf.
// The visitor picks 2, 4 or 6 pairs a row (kept in this browser); 2 rows make a page, with a page bar under the wall.
// Picture: an uploaded background-free photo (Admin "Home page photo") > a built-in cutout (src/data/cutouts.js
// shoes / shoeWall) > the product photo in a small frame.

const DENSITY = [2, 4, 6];
const COLS = { // phone / tablet / desktop columns for each choice (Tailwind needs whole class names)
  2: 'grid-cols-1 sm:grid-cols-2',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6',
};
const SHOE_H = { 2: 'h-[190px] sm:h-[240px]', 4: 'h-[130px] sm:h-[150px] lg:h-[170px]', 6: 'h-[110px] sm:h-[120px] lg:h-[125px]' };
const ROW_GAP = { 2: 'gap-y-12 sm:gap-y-20', 4: 'gap-y-10 sm:gap-y-20', 6: 'gap-y-10 sm:gap-y-16' };
const builtIn = new Set([...(CUTOUTS.shoes || []), ...(CUTOUTS.shoeWall || [])].map((c) => c.id));

// the density buttons: bars that get thinner as more pairs fit a row
function DensityIcon({ n, active }) {
  const w = n === 2 ? 5 : n === 4 ? 3 : 2;
  const gap = n === 2 ? 2 : 1.5;
  const total = n * w + (n - 1) * gap;
  return (
    <svg viewBox={`0 0 ${total} 12`} className="h-[13px]" style={{ width: total * 1.4 }} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={i * (w + gap)} y="0" width={w} height="12" rx="0.6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 0.7} />
      ))}
    </svg>
  );
}

export default function ShoeWall({ products, formatPrice, isDarkMode, openProduct }) {
  const showcase = useShowcase();
  const uploaded = showcase || {};
  const [cols, setCols] = useState(() => {
    try { const v = Number(localStorage.getItem('kyvro_shoe_cols')); if (DENSITY.includes(v)) return v; } catch (e) { /* no storage */ }
    return 4;
  });
  const choose = (n) => { setCols(n); setPage(0); try { localStorage.setItem('kyvro_shoe_cols', String(n)); } catch (e) { /* no storage */ } };
  const [page, setPage] = useState(0);
  const perPage = cols * 2;
  const pages = Math.max(1, Math.ceil(products.length / perPage));
  useEffect(() => { if (page > pages - 1) setPage(0); }, [pages, page]);
  const listKey = products.map((p) => p.id).join(',');
  useEffect(() => { setPage(0); }, [listKey]); // a new search / sort starts at page 1

  const pictureOf = (p) => {
    const up = uploaded[String(p.id)];
    if (up && up.image) return { src: up.image, cut: true };
    if (builtIn.has(String(p.id)) && !(up && up.off)) return { src: cutoutSrc(String(p.id)), cut: true };
    return { src: p.image, cut: false };
  };
  const shown = useMemo(() => products.slice(page * perPage, page * perPage + perPage), [products, page, perPage]);
  const pad = (n) => String(n).padStart(2, '0');
  const go = (d) => {
    setPage((x) => Math.min(pages - 1, Math.max(0, x + d)));
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* old browser */ }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-10 sm:mb-14">
        <div>
          <p className={`text-[10px] sm:text-[11px] tracking-[0.3em] uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>The Shoe Wall</p>
          <p className="mt-2 text-2xl sm:text-4xl font-light leading-tight">
            Find your next pair.<sup className={`ml-1.5 text-xs sm:text-sm font-normal ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{products.length}</sup>
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Pairs per row">
          {DENSITY.map((n) => (
            <button key={n} type="button" onClick={() => choose(n)} aria-pressed={cols === n} title={`${n} per row`}
              className={`flex h-9 items-center rounded-full px-3 transition ${cols === n ? (isDarkMode ? 'text-white bg-white/10' : 'text-black bg-black/[.06]') : (isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')}`}>
              <DensityIcon n={n} active={cols === n} />
            </button>
          ))}
        </div>
      </div>

      {!showcase ? (
        <div aria-hidden="true" className="h-[420px]" />
      ) : products.length === 0 ? (
        <p className="py-20 text-center text-sm text-gray-500">No shoes found.</p>
      ) : (
        <div className={`grid ${COLS[cols]} gap-x-6 sm:gap-x-10 lg:gap-x-14 ${ROW_GAP[cols]}`}>
          {shown.map((p) => {
            const pic = pictureOf(p);
            const old = Number(p.originalPrice) || 0;
            const pct = old > p.price && p.price > 0 ? Math.round(((old - p.price) / old) * 100) : 0;
            const out = totalStock(p) <= 0;
            return (
              <button key={p.id} type="button" onClick={() => openProduct(p)} aria-label={`${p.name}, ${formatPrice(p.price)}`}
                className="group relative block w-full text-left focus:outline-none">
                {/* the pair, standing on the shelf: it lifts a little on hover */}
                <div className={`relative ${SHOE_H[cols]} flex items-end justify-center px-[12%]`}>
                  {pic.cut ? (
                    <img src={pic.src} alt={p.name} loading="lazy" draggable={false}
                      className="max-h-full max-w-full object-contain object-bottom transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="h-[86%] aspect-square overflow-hidden rounded-md bg-white shadow-sm transition-transform duration-500 ease-out group-hover:-translate-y-2">
                      <img src={pic.src} alt={p.name} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                    </div>
                  )}
                  {out && <span className="absolute left-0 top-0 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">SOLD OUT</span>}
                </div>
                {/* the shelf: a dark board with a light front edge and a soft shadow on the wall */}
                <div className="relative mx-[2%]">
                  <div className={`h-[3px] rounded-t-[1px] ${isDarkMode ? 'bg-[#5a5a5a]' : 'bg-[#4a4a4a]'}`} />
                  <div className={`h-[6px] rounded-b-[2px] ${isDarkMode ? 'bg-gradient-to-b from-[#2b2b2b] to-[#121212]' : 'bg-gradient-to-b from-[#2a2a2a] to-[#0f0f0f]'}`} />
                  <span aria-hidden="true" className="pointer-events-none absolute left-[4%] right-[4%] top-full h-[18px] transition-opacity duration-500 opacity-70 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,.28), rgba(0,0,0,0))' }} />
                </div>
                {/* name + price under the shelf */}
                <div className="mt-5 px-[2%]">
                  <p className={`line-clamp-1 font-medium ${cols === 6 ? 'text-[11px]' : 'text-xs sm:text-[13px]'} ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} group-hover:underline underline-offset-4`}>{p.name}</p>
                  <p className={`mt-1 flex flex-wrap items-baseline gap-x-2 ${cols === 6 ? 'text-[11px]' : 'text-xs sm:text-[13px]'}`}>
                    <span className="font-bold">{formatPrice(p.price)}</span>
                    {pct > 0 && <span className="text-gray-400 line-through">{formatPrice(old)}</span>}
                    {pct > 0 && <span className="font-bold text-red-600">-{pct}%</span>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-16 sm:mt-20 flex items-center gap-4 sm:gap-6">
          <div className={`relative h-[2px] flex-1 ${isDarkMode ? 'bg-white/15' : 'bg-black/10'}`}>
            <span className={`absolute left-0 top-0 h-full transition-all duration-500 ${isDarkMode ? 'bg-white' : 'bg-black'}`} style={{ width: `${((page + 1) / pages) * 100}%` }} />
          </div>
          <span className="text-xs tracking-[0.2em] tabular-nums">
            {pad(page + 1)} <span className="text-gray-400">/ {pad(pages)}</span>
          </span>
          <div className="flex gap-2">
            {[[-1, ChevronLeft, 'Previous page'], [1, ChevronRight, 'Next page']].map(([d, Icon, label]) => (
              <button key={d} type="button" onClick={() => go(d)} aria-label={label} disabled={d < 0 ? page === 0 : page >= pages - 1}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition disabled:opacity-30 ${isDarkMode ? 'border-white/20 hover:border-white' : 'border-black/15 hover:border-black'}`}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
