import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { hasSizeStock, hasColorStock, stockForSize, orderedSizes, productColors } from '../data/catalog';
import { shortPrice } from './HangerRail';

// Shoes on a big circle: drag / swipe (or the arrows) to turn the wheel, the shoe at the front is the chosen one.
// Click the front shoe (or View details) for the quick view; a size + Add to cart works right here too.
const STEP = 0.42;               // angle between two shoes (radians)
const FRONT = -1.78;             // where the front shoe sits on the circle (up and a little left)

export default function ShoeOrbit({ products, formatPrice, onOpen, addToCart, onShopAll }) {
  const boxRef = useRef(null);
  const [dim, setDim] = useState({ w: 1200, h: 640 });
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState(null);
  const drag = useRef({ x: 0, start: 0, moved: false });
  const n = products.length;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const active = ((Math.round(pos) % n) + n) % n;
  const shoe = products[active];
  useEffect(() => { setSize(null); }, [active]);

  const phone = dim.w < 768;
  const R = phone ? dim.w * 1.05 : Math.min(dim.w * 0.6, 820);
  // the front shoe sits at (fx, fy); the circle's centre is worked out from it
  const fx = phone ? dim.w * 0.5 : dim.w * 0.52;
  const fy = phone ? dim.h * 0.47 : dim.h * 0.46;
  const cx = fx - R * Math.cos(FRONT);
  const cy = fy - R * Math.sin(FRONT);
  const big = phone ? 180 : Math.max(220, Math.min(300, dim.w * 0.22));

  const rel = (i) => {
    let d = (i - pos) % n;
    if (d < -n / 2) d += n;
    if (d >= n / 2) d -= n;
    return d;
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, start: pos, moved: false };
    setDragging(true);
    const move = (ev) => {
      const dx = ev.clientX - drag.current.x;
      if (Math.abs(dx) > 6) drag.current.moved = true;
      setPos(drag.current.start - dx / (phone ? 110 : 170));
    };
    const up = () => {
      setDragging(false);
      setPos((v) => Math.round(v));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const clickShoe = (i) => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    const d = rel(i);
    if (Math.abs(d) < 0.5) onOpen(active);
    else setPos(Math.round(pos + d));
  };

  if (!n) return null;
  const sizes = Array.isArray(shoe.sizes) ? orderedSizes(shoe.sizes.filter(Boolean), shoe.gender) : [];
  // a size is free when any colour still has it
  const inStock = (s) => (hasColorStock(shoe)
    ? Object.entries(shoe.colorStock).some(([k, v]) => k.split('|')[0] === s && (parseInt(v, 10) || 0) > 0)
    : (hasSizeStock(shoe) ? stockForSize(shoe, s) > 0 : true));
  const manyColours = productColors(shoe).length > 1;
  const wheelShift = -pos * 26;

  return (
    <section className="relative w-full overflow-hidden bg-white text-black">
      <div className="pt-10 sm:pt-14 px-4 text-center">
        <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase">
          <span className="font-bold">STEP IN</span><span className="mx-3 text-gray-300">|</span><span className="font-semibold text-gray-500">Shoes</span>
        </p>
      </div>

      <div ref={boxRef} onPointerDown={onPointerDown}
        className={`relative h-[610px] sm:h-[640px] lg:h-[calc(100vh-150px)] lg:min-h-[600px] select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'pan-y' }}>
        {/* the orbit lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e5e5" strokeWidth="1.2" />
          <circle cx={cx + R * 0.08} cy={cy + R * 0.12} r={R * 0.86} fill="none" stroke="#ececec" strokeWidth="1" strokeDasharray="3 6" />
        </svg>

        {products.map((p, i) => {
          const d = rel(i);
          const far = Math.abs(d);
          if (far > 4.2) return null;
          const a = FRONT + d * STEP;
          const x = cx + R * Math.cos(a);
          const y = cy + R * Math.sin(a);
          const scale = Math.max(0.24, 1 - far * 0.4);
          return (
            <button key={p.id} type="button" onClick={() => clickShoe(i)} aria-label={p.name}
              className="absolute left-0 top-0"
              style={{
                width: big, height: big,
                transform: `translate(${x - big / 2}px, ${y - big / 2}px) scale(${scale})`,
                opacity: far > 3.4 ? 0 : 1 - far * 0.12,
                zIndex: 100 - Math.round(far * 10),
                transition: dragging ? 'none' : 'transform 600ms cubic-bezier(.2,.8,.2,1), opacity 400ms',
              }}>
              {p.cutout ? (
                // background-free shoe floating over a soft shadow
                <span className="relative block h-full w-full">
                  <span className="absolute inset-x-[14%] bottom-[16%] h-[9%] rounded-[50%] bg-black/25 blur-[14px]" />
                  <img src={p.cutout} alt="" draggable={false} className="relative h-full w-full object-contain" />
                </span>
              ) : (
                <span className="block h-full w-full overflow-hidden rounded-[22px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,.35)] ring-1 ring-black/5">
                  <img src={p.image} alt="" draggable={false} className="h-full w-full object-cover" />
                </span>
              )}
            </button>
          );
        })}

        {/* chosen shoe: name + price */}
        <div className="pointer-events-none absolute left-5 right-5 top-4 sm:left-12 sm:top-10 sm:right-auto sm:max-w-[360px] z-[120]">
          <p className="text-[11px] tracking-[0.25em] text-gray-500">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
          <h3 key={shoe.id} className="kyvro-fade mt-1 text-2xl sm:text-5xl font-extrabold uppercase leading-[0.95] tracking-tight line-clamp-2">{shoe.name}</h3>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg font-bold">{shortPrice(formatPrice, shoe.price)}</p>
          <button type="button" onClick={() => onOpen(active)} onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto group mt-2 sm:mt-4 inline-flex items-center gap-2 border-b border-black pb-0.5 text-xs font-semibold">
            View details <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        {/* sizes + add */}
        {sizes.length > 0 && (
          <div onPointerDown={(e) => e.stopPropagation()} className="absolute z-[120] bottom-24 left-5 right-5 sm:left-auto sm:right-12 sm:bottom-14 sm:w-[300px] cursor-default">
            <div className="grid grid-cols-5 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {sizes.map((s) => (
                <button key={s} type="button" disabled={!inStock(s)} onClick={() => setSize(s)}
                  className={`h-10 sm:h-11 rounded-md border text-sm font-bold transition duration-300 ${size === s ? 'border-black bg-black text-white' : 'border-gray-300 bg-white/90 hover:border-black'} disabled:opacity-30 disabled:line-through`}>{s}</button>
              ))}
            </div>
            <button type="button" disabled={!size && !manyColours} onClick={() => (manyColours ? onOpen(active) : addToCart(shoe, undefined, size, 1, false))}
              className="mt-2.5 w-full rounded-full bg-black py-3 text-sm font-bold text-white transition duration-300 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {manyColours ? 'Choose colour' : size ? 'Add to cart' : 'Select a size'}
            </button>
          </div>
        )}

        {/* the wheel: drag it, or use the arrows */}
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-5 left-1/2 z-[120] -translate-x-1/2 flex items-center gap-3 cursor-default">
          <button type="button" aria-label="Previous shoe" onClick={() => setPos(Math.round(pos) - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white hover:border-black"><ArrowLeft size={16} /></button>
          <div className="text-center">
            <div onPointerDown={onPointerDown} className="h-5 w-40 sm:w-64 rounded-full border border-gray-300 shadow-inner cursor-grab"
              style={{ background: `repeating-linear-gradient(90deg,#d4d4d4 0 2px,#f7f7f7 2px 26px)`, backgroundPositionX: `${wheelShift}px`, transition: dragging ? 'none' : 'background-position 600ms' }} />
            <p className="mt-1 text-[9px] tracking-[0.3em] text-gray-400">DRAG THE WHEEL</p>
          </div>
          <button type="button" aria-label="Next shoe" onClick={() => setPos(Math.round(pos) + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white hover:border-black"><ArrowRight size={16} /></button>
        </div>
      </div>

      <div className="flex justify-center pb-10">
        <button type="button" onClick={onShopAll} className="group inline-flex items-center gap-2 border-b border-black pb-0.5 text-xs font-semibold">
          Shop all shoes <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
}
