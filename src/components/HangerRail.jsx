import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

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

export function PriceTagHang({ children, rotate = -6 }) {
  return (
    <span className="absolute left-1/2 top-[30px] z-10 ml-1 whitespace-nowrap rounded-[3px] bg-white px-1.5 py-[3px] text-[9px] sm:text-[10px] font-extrabold text-black shadow-[0_2px_6px_rgba(0,0,0,.18)]"
      style={{ transform: `rotate(${rotate}deg)` }}>
      <span className="absolute left-1/2 top-[2px] -ml-[1.5px] h-[3px] w-[3px] rounded-full bg-gray-300" />
      <span className="block pt-[3px]">{children}</span>
    </span>
  );
}

function Rod({ variant }) {
  if (variant === 'curve') {
    return (
      <svg className="pointer-events-none absolute inset-x-0 w-full" style={{ top: ROD_Y - 3, height: SAG + 10 }} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="kyvroRod" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d9dadc" />
            <stop offset="0.45" stopColor="#9a9da3" />
            <stop offset="1" stopColor="#c9cbce" />
          </linearGradient>
        </defs>
        {/* quadratic curve: the middle drops by SAG (control point = 2 x SAG) */}
        <path d="M0 6 Q500 194 1000 6" fill="none" stroke="url(#kyvroRod)" strokeWidth="6" vectorEffect="non-scaling-stroke" />
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
  tagline = [], variant = 'curve', tone = 'grey', tabs = null, activeTab, onTab,
}) {
  const scRef = useRef(null);
  const barRef = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [hover, setHover] = useState(-1);
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
  }, [activeTab, update]);
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

  const hovered = hover >= 0 ? products[hover] : null;

  return (
    <section className="relative isolate w-full overflow-hidden text-black lg:min-h-[calc(100vh-72px)] flex flex-col" style={{ background: TONES[tone] || TONES.grey }}>
      <div className="pt-10 sm:pt-14 px-4 text-center">
        <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase">
          <span className="font-bold">{label}</span>
          <span className="mx-3 text-gray-300">|</span>
          <span className="font-semibold text-gray-500">{title}</span>
        </p>
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
              <div key={p.id} data-hang className={`relative shrink-0 ${p.cutout ? 'w-[112px] sm:w-[140px] lg:w-[158px]' : 'w-[118px] sm:w-[150px] lg:w-[172px]'}`} style={{ marginTop: 'var(--sag, 0px)' }}>
                <div className="kyvro-swing" style={{ animationDelay: `${-((i * 1.37) % 5.5)}s`, animationDuration: `${5 + (i % 3) * 0.6}s` }}>
                  <button type="button" onClick={() => onOpen(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)} onFocus={() => setHover(i)} onBlur={() => setHover(-1)}
                    aria-label={`${p.name}, ${shortPrice(formatPrice, p.price)}`}
                    className={`group relative block w-full origin-top transition-transform duration-300 ease-out ${hover === i ? 'z-10 scale-[1.1] translate-y-1' : ''}`}>
                    {/* hook over the rod + wire */}
                    <svg viewBox="0 0 20 40" className="mx-auto block h-[34px] w-[17px]" aria-hidden="true">
                      <path d="M10 40 V14 C10 6 3 5 3 10" fill="none" stroke="#8e9197" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <PriceTagHang rotate={i % 2 ? 5 : -6}>{shortPrice(formatPrice, p.price)}</PriceTagHang>
                    {p.cutout ? (
                      <>
                        {/* background-free photo: it hangs on its own hanger, or on ours */}
                        {!p.cutoutHanger && <Hanger className="relative z-[2] -mt-[2px] mx-auto block w-[62%]" />}
                        <img src={p.cutout} alt={p.name} loading="lazy" draggable={false}
                          className={`relative mx-auto block h-[150px] sm:h-[190px] lg:h-[215px] w-full object-contain object-top transition-[filter] duration-300 ${p.cutoutHanger ? '-mt-[3px]' : '-mt-[12px]'} ${hover === i ? 'drop-shadow-[0_22px_22px_rgba(0,0,0,.28)]' : 'drop-shadow-[0_12px_12px_rgba(0,0,0,.16)]'}`} />
                      </>
                    ) : (
                      <>
                        <Hanger className="relative z-[1] -mt-[2px] mx-auto block w-[78%]" />
                        {/* the photo card, held by two clips under the hanger */}
                        <div className="relative mx-auto -mt-[3px] w-[88%]">
                          {['left-[14%]', 'right-[14%]'].map((c) => (
                            <span key={c} className={`absolute ${c} -top-[5px] z-[2] h-[12px] w-[7px] rounded-[2px] bg-gradient-to-b from-[#d6d7da] to-[#8f9298] shadow-sm`} />
                          ))}
                          <div className={`aspect-[3/4] w-full overflow-hidden rounded-b-[8px] rounded-t-[2px] bg-white transition-shadow duration-300 ${hover === i ? 'shadow-[0_22px_30px_-10px_rgba(0,0,0,.35)]' : 'shadow-[0_10px_18px_-10px_rgba(0,0,0,.28)]'}`}>
                            <img src={p.image} alt={p.name} loading="lazy" draggable={false} className="h-full w-full object-cover object-top" />
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
