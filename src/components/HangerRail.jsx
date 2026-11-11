import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

// A clothes rail on the home page: products hang from a metal rod on wire hooks and wooden hangers.
// The row moves only when the visitor drags (mouse) or swipes (touch); a drag never opens a product.
// variant 'curve' = a rod that sags in the middle, 'straight' = a straight rod with wall brackets.

export const shortPrice = (formatPrice, v) => String(formatPrice(v)).replace(/\.00$/, '');

const TONES = { grey: '#f1f1f0', white: '#ffffff', blue: '#eef1f5' };
const ROD_Y = 18; // where the rod sits, from the top of the rail
const SAG = 34;   // how far the curved rod drops in the middle

export function Hanger({ className = '' }) {
  // wooden hanger seen from the front: a curved bar with a small hook joint
  return (
    <svg viewBox="0 0 120 22" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kyvroWood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#9a6a43" />
          <stop offset="1" stopColor="#6b4428" />
        </linearGradient>
      </defs>
      <path d="M4 19 Q60 -2 116 19" fill="none" stroke="url(#kyvroWood)" strokeWidth="5" strokeLinecap="round" />
      <rect x="55" y="3" width="10" height="7" rx="2" fill="#5a3820" />
    </svg>
  );
}

// The tag on the hook: discount % on the left; on the right the old price crossed out above today's price
export function PriceTagHang({ price, originalPrice, formatPrice, rotate = -6 }) {
  const old = Number(originalPrice) || 0;
  const pct = old > price && price > 0 ? Math.round(((old - price) / old) * 100) : 0;
  return (
    <span className="absolute left-1/2 top-[30px] z-10 ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] bg-white px-1.5 py-[3px] text-black shadow-[0_2px_6px_rgba(0,0,0,.18)]"
      style={{ transform: `rotate(${rotate}deg)` }}>
      <span className="absolute left-1/2 top-[2px] -ml-[1.5px] h-[3px] w-[3px] rounded-full bg-gray-300" />
      {pct > 0 && <span className="mt-[3px] rounded-[2px] bg-red-600 px-1 text-[8px] sm:text-[9px] font-extrabold leading-[14px] text-white">-{pct}%</span>}
      <span className="flex flex-col items-end pt-[3px] leading-none">
        {pct > 0 && <span className="text-[7px] sm:text-[8px] font-semibold text-gray-400 line-through">{shortPrice(formatPrice, old)}</span>}
        <span className="text-[9px] sm:text-[10px] font-extrabold">{shortPrice(formatPrice, price)}</span>
      </span>
    </span>
  );
}

function Rod({ variant }) {
  if (variant === 'curve') {
    return (
      // a thick metal tube: soft shadow under it, the grey body, a light line along the top
      // svg box: from ROD_Y - 10 px, SAG + 24 px high; the rod's middle is SAG px lower than its ends
      <svg className="pointer-events-none absolute inset-x-0 w-full overflow-visible" style={{ top: ROD_Y - 10, height: SAG + 24 }} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        {(() => {
          const u = 100 / (SAG + 24); // svg units per px
          const y0 = 10 * u;
          const c = 2 * (10 + SAG) * u - y0; // quadratic control point: the middle of the curve is (y0 + c) / 2
          const d = (dy) => `M0 ${y0 + dy * u} Q500 ${c + dy * u} 1000 ${y0 + dy * u}`;
          return (
            <>
              <path d={d(5)} fill="none" stroke="rgba(0,0,0,.10)" strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={d(0)} fill="none" stroke="#a7aab0" strokeWidth="13" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={d(-1)} fill="none" stroke="#c4c7cb" strokeWidth="8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={d(-3)} fill="none" stroke="#eef0f2" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          );
        })()}
      </svg>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-x-3 sm:inset-x-8" style={{ top: ROD_Y - 3 }} aria-hidden="true">
      <div className="h-[6px] rounded-full bg-gradient-to-b from-[#e2e3e5] via-[#9b9ea4] to-[#cfd1d4] shadow-[0_2px_3px_rgba(0,0,0,.12)]" />
      {['left-0', 'right-0'].map((side) => (
        <span key={side} className={`absolute ${side} -top-[10px] h-[26px] w-[10px] rounded-[3px] bg-gradient-to-r from-[#b9bcc1] via-[#e4e5e7] to-[#9fa2a8] shadow`} />
      ))}
    </div>
  );
}

export default function HangerRail({
  label = 'NEW COLLECTION', title, products, formatPrice, onOpen, onShopAll,
  tagline = [], variant = 'curve', tone = 'grey', card = 'portrait',
  filters = null, filter = null, onFilter = null, tabs = null, activeTab, onTab, // filters: section picker next to the title [{ key, label }], key null = All
}) {
  const scRef = useRef(null);
  const barRef = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [hover, setHover] = useState(-1);
  const [pick, setPick] = useState(false); // section picker open
  const [tapped, setTapped] = useState(-1); // touch: the first tap turns a side-view piece to the front, the next opens it
  const pointer = useRef('mouse');
  const sag = variant === 'curve' ? SAG : 0;

  // each hook gets longer or shorter so it meets the sagging rod at its place on the screen
  const update = useCallback(() => {
    const sc = scRef.current;
    if (!sc) return;
    const box = sc.getBoundingClientRect();
    if (sag) {
      sc.querySelectorAll('[data-hang]').forEach((el) => {
        const b = el.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (b.left + b.width / 2 - box.left) / box.width));
        el.style.setProperty('--sag', `${(sag * (1 - (2 * t - 1) ** 2)).toFixed(1)}px`);
      });
    }
    const max = sc.scrollWidth - sc.clientWidth;
    const frac = Math.min(1, sc.clientWidth / Math.max(1, sc.scrollWidth));
    if (barRef.current) {
      barRef.current.style.width = `${frac * 100}%`;
      barRef.current.style.left = `${(max > 0 ? sc.scrollLeft / max : 0) * (1 - frac) * 100}%`;
    }
  }, [sag]);

  useLayoutEffect(() => { update(); }, [update, products]);
  useEffect(() => {
    const sc = scRef.current;
    if (sc) sc.scrollLeft = 0;
    update();
  }, [activeTab, filter, update]);
  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  // mouse drag (touch scrolls natively)
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { down: true, x: e.clientX, left: scRef.current.scrollLeft, moved: false };
    const move = (ev) => {
      const dx = ev.clientX - drag.current.x;
      if (Math.abs(dx) > 5) drag.current.moved = true;
      scRef.current.scrollLeft = drag.current.left - dx;
    };
    const up = () => {
      drag.current.down = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
  };

  const hovered = hover >= 0 ? products[hover] : (tapped >= 0 ? products[tapped] : null);
  const tap = (i) => {
    const p = products[i];
    if (p.cutoutSide && pointer.current !== 'mouse' && tapped !== i) { setTapped(i); return; }
    onOpen(i);
  };

  return (
    <section className="relative isolate w-full overflow-hidden text-black lg:min-h-[calc(100vh-72px)] flex flex-col" style={{ background: TONES[tone] || TONES.grey }}>
      <div className="pt-10 sm:pt-14 px-4 text-center">
        <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase">
          <span className="font-bold">{label}</span>
          <span className="mx-3 text-gray-300">|</span>
          <span className="font-semibold text-gray-500">{title}</span>
        </p>
        {filters && filters.length > 0 && (
          <div className="relative mt-3 inline-block">
            <button type="button" onClick={() => setPick((o) => !o)} aria-expanded={pick}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-1.5 text-[11px] font-semibold tracking-wider text-black shadow-sm transition hover:border-black">
              {(filters.find((f) => f.key === filter) || { label: 'All' }).label}
              <ChevronDown size={14} className={`transition-transform ${pick ? 'rotate-180' : ''}`} />
            </button>
            {pick && (
              <div className="absolute left-1/2 z-30 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-left shadow-xl">
                {[{ key: null, label: 'All' }, ...filters].map((f) => (
                  <button key={f.key || 'all'} type="button" onClick={() => { setPick(false); onFilter(f.key); }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-xs transition hover:bg-gray-100 ${f.key === filter ? 'font-bold text-black' : 'text-gray-700'}`}>
                    <span>{f.label}</span>
                    {f.count != null && <span className="text-[10px] text-gray-400">{f.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {tabs && (
          <div className="mt-4 inline-flex gap-1 rounded-full bg-black/[.05] p-1">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => onTab(t.key)}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-wider transition duration-300 ${activeTab === t.key ? 'bg-black text-white' : 'text-gray-600 hover:text-black'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 flex flex-col justify-center py-6 sm:py-10">
        <div className="relative">
          <Rod variant={variant} />
          <div ref={scRef} onScroll={update} onPointerDown={onPointerDown} onClickCapture={onClickCapture}
            className="kyvro-noscroll relative flex items-start gap-3 sm:gap-6 overflow-x-auto px-6 sm:px-12 cursor-grab active:cursor-grabbing select-none"
            style={{ paddingTop: ROD_Y - 8, paddingBottom: 28 }}>
            {products.map((p, i) => (
              <div key={p.id} data-hang onTransitionEnd={update}
                className={`relative shrink-0 transition-[width] duration-300 ease-out ${!p.cutout ? 'w-[118px] sm:w-[150px] lg:w-[172px]'
                  : (p.cutoutSide && hover !== i && tapped !== i) ? 'w-[78px] sm:w-[98px] lg:w-[112px]' : 'w-[136px] sm:w-[172px] lg:w-[196px]'}`}
                style={{ marginTop: 'var(--sag, 0px)' }}>
                <div className="kyvro-swing" style={{ animationDelay: `${-((i * 1.37) % 5.5)}s`, animationDuration: `${5 + (i % 3) * 0.6}s` }}>
                  <button type="button" onPointerDown={(e) => { pointer.current = e.pointerType; }} onClick={() => tap(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)}
                    aria-label={`${p.name}, ${shortPrice(formatPrice, p.price)}`}
                    className={`group relative block w-full origin-top transition-transform duration-300 ease-out ${hover === i ? 'z-10 scale-[1.1] translate-y-1' : ''}`}>
                    {/* hook over the rod + wire */}
                    <svg viewBox="0 0 20 40" className="mx-auto block h-[34px] w-[17px]" aria-hidden="true">
                      <path d="M10 40 V14 C10 6 3 5 3 10" fill="none" stroke="#8e9197" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <PriceTagHang rotate={i % 2 ? 5 : -6} price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} />
                    {p.cutout ? (() => {
                      // with a side photo the piece hangs side-on and turns to the front on hover / tap
                      const front = !p.cutoutSide || hover === i || tapped === i;
                      const shadow = hover === i || tapped === i ? 'drop-shadow-[0_22px_22px_rgba(0,0,0,.28)]' : 'drop-shadow-[0_12px_12px_rgba(0,0,0,.16)]';
                      return (
                        <>
                          {/* background-free photo: it hangs on its own hanger, or on ours */}
                          {!p.cutoutHanger && (
                            <Hanger className={`relative z-[2] -mt-[2px] mx-auto block transition-all duration-300 ${front ? 'w-[62%]' : 'w-[22%]'}`} />
                          )}
                          <div className={`relative h-[185px] sm:h-[235px] lg:h-[270px] w-full ${p.cutoutHanger ? '-mt-[3px]' : '-mt-[12px]'}`}>
                            {p.cutoutSide && (
                              // sized by height (not width), so a wide side photo (a puffer jacket) hangs as tall as the shirts
                              <img src={p.cutoutSide} alt="" aria-hidden="true" loading="lazy" draggable={false}
                                className={`absolute left-1/2 top-0 h-full w-auto max-w-none transition-transform duration-200 ease-in ${shadow}`}
                                style={{ transform: `translateX(-50%) scaleX(${front ? 0 : 1})` }} />
                            )}
                            <img src={p.cutout} alt={p.name} loading="lazy" draggable={false}
                              className={`absolute inset-0 h-full w-full object-contain object-top transition-transform duration-300 ease-out ${shadow}`}
                              style={{ transform: `scaleX(${front ? 1 : 0})`, transitionDelay: front && p.cutoutSide ? '150ms' : '0ms' }} />
                          </div>
                        </>
                      );
                    })() : (
                      <>
                        <Hanger className="relative z-[1] -mt-[2px] mx-auto block w-[78%]" />
                        {/* the photo card, held by two clips under the hanger */}
                        <div className="relative mx-auto -mt-[3px] w-[88%]">
                          {['left-[14%]', 'right-[14%]'].map((c) => (
                            <span key={c} className={`absolute ${c} -top-[5px] z-[2] h-[12px] w-[7px] rounded-[2px] bg-gradient-to-b from-[#d6d7da] to-[#8f9298] shadow-sm`} />
                          ))}
                          <div className={`${card === 'square' ? 'aspect-square' : 'aspect-[3/4]'} w-full overflow-hidden rounded-b-[8px] rounded-t-[2px] bg-white transition-shadow duration-300 ${hover === i ? 'shadow-[0_22px_30px_-10px_rgba(0,0,0,.35)]' : 'shadow-[0_10px_18px_-10px_rgba(0,0,0,.28)]'}`}>
                            {/* square cards (watches, bags, wallets) show the whole photo, never cut */}
                            <img src={p.image} alt={p.name} loading="lazy" draggable={false} className={`h-full w-full ${card === 'square' ? 'object-contain' : 'object-cover object-top'}`} />
                          </div>
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-3 items-end gap-4 px-6 sm:px-10 pb-8 sm:pb-10">
        <div className="hidden sm:block min-h-[38px] text-sm">
          {hovered ? (
            <div className="kyvro-fade">
              <p className="font-bold line-clamp-1">{hovered.name}</p>
              <p className="text-gray-600">{shortPrice(formatPrice, hovered.price)}</p>
            </div>
          ) : (
            <p className="flex items-center gap-3 text-xs text-gray-500"><span className="h-px w-6 bg-gray-400" />Drag the rail · click a piece to look closer</p>
          )}
        </div>
        <div className="flex justify-center order-first sm:order-none">
          <div className="relative h-[2px] w-32 sm:w-40 bg-black/10">
            <span ref={barRef} className="absolute top-0 h-full bg-black transition-[left] duration-100" />
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
          {tagline.length > 0 && <p className="text-sm sm:text-base font-bold leading-snug">{tagline.map((t, i) => <span key={i} className="block">{t}</span>)}</p>}
          <button type="button" onClick={onShopAll} className="group mt-3 inline-flex items-center gap-2 border-b border-black pb-0.5 text-xs font-semibold">
            Shop the Collection <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
