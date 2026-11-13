import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Pause, Play } from 'lucide-react';
import { watchLooks } from '../looks';
import { totalStock, hasSizeStock, orderedSizes, stockFor, stockForColor, productColors } from '../data/catalog';

// Home page "Shop the Look" (Classic theme, between the Men's and Women's rails). Models (looks/{id}, made in
// Admin → Shop the Look) stand side by side: the one in the middle is sharp, the others step back. Tap a model to
// bring it forward; the panel lists the pieces it wears with price, stock, size and Add to cart (or the whole look).
// Prices come from the products the page already shows, so a shop link gets its own prices.
let cache = null; // the looks, kept for the next visit to the home page

function Piece({ n, p, pick, setPick, active, onHover, formatPrice, onAdd }) {
  const sized = hasSizeStock(p);
  const sizes = sized ? orderedSizes(Object.keys(p.sizeStock), p.gender) : [];
  const colors = productColors(p);
  const color = pick.color || colors.find((c) => stockForColor(p, c) > 0) || colors[0] || '';
  const out = totalStock(p) <= 0;
  const left = (s) => stockFor(p, s, color);
  return (
    <div onMouseEnter={onHover} className={`py-4 border-b border-black/10 flex gap-3 transition ${active ? 'bg-[#D4AF37]/10 -mx-3 px-3 rounded-lg' : ''}`}>
      <div className="relative w-20 h-24 shrink-0 rounded-md overflow-hidden bg-[#f1f1f0]">
        <img src={p.image} alt={p.name} loading="lazy" className={`w-full h-full object-cover ${out ? 'grayscale opacity-60' : ''}`} />
        <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shadow">{n}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{p.category}</p>
        <p className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</p>
        <p className="mt-0.5 text-sm">
          <span className="font-bold">{formatPrice(p.price)}</span>
          {p.originalPrice > p.price && <span className="ml-1.5 text-xs text-gray-400 line-through">{formatPrice(p.originalPrice)}</span>}
        </p>
        {out ? <p className="mt-1 text-xs font-bold text-red-600">Out of stock</p> : (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {colors.length > 1 && colors.map((c) => (
              <button key={c} type="button" disabled={stockForColor(p, c) <= 0} onClick={() => setPick({ ...pick, color: c, size: '' })}
                className={`px-2 py-0.5 rounded-full border text-[11px] disabled:opacity-30 disabled:line-through ${color === c ? 'border-black bg-black text-white' : 'border-gray-300'}`}>{c}</button>
            ))}
            {sizes.map((s) => (
              <button key={s} type="button" disabled={left(s) <= 0} onClick={() => setPick({ ...pick, color, size: s })}
                className={`min-w-[2rem] px-1.5 py-0.5 rounded border text-[11px] font-semibold disabled:opacity-30 disabled:line-through ${pick.size === s ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-300'}`}>{s}</button>
            ))}
          </div>
        )}
      </div>
      {!out && <button type="button" onClick={onAdd} className="self-center shrink-0 w-9 h-9 rounded-full border border-black/20 hover:bg-black hover:text-white text-lg leading-none" aria-label={`Add ${p.name} to cart`}>+</button>}
    </div>
  );
}

export default function ShopTheLook({ products = [], formatPrice, addToCart }) {
  const [looks, setLooks] = useState(cache);
  useEffect(() => watchLooks((l) => { cache = l; setLooks(l); }), []);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products]);
  // only ON looks with at least one piece this page sells
  const shown = useMemo(() => (looks || []).filter((l) => l.active)
    .map((l) => ({ ...l, pieces: l.items.map((it, i) => ({ ...it, n: i + 1, p: byId[it.id] })).filter((x) => x.p) }))
    .filter((l) => l.pieces.length > 0), [looks, byId]);
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState({}); // productId -> { size, color }
  const [hot, setHot] = useState(null); // highlighted pin
  const [msg, setMsg] = useState(null);
  const swipe = useRef(null); // drag (mouse) / swipe (phone) start
  const dragged = useRef(false);
  useEffect(() => { setMsg(null); setHot(null); }, [at]);
  // turns by itself every 3 s; stops while the visitor is in the pieces panel (picking a size), for 8 s after they touch it, or with Pause
  const SPIN = 3000;
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const holdUntil = useRef(0);
  const count = shown.length;
  useEffect(() => {
    if (!playing || hover || count < 2) return undefined;
    const t = setInterval(() => { if (Date.now() > holdUntil.current) setAt((a) => (a + 1) % count); }, SPIN);
    return () => clearInterval(t);
  }, [playing, hover, count]);
  const hold = () => { holdUntil.current = Date.now() + 8000; };
  if (!shown.length) return null;
  const i = Math.min(at, shown.length - 1);
  const look = shown[i];
  const go = (k) => { hold(); setAt((k + shown.length) % shown.length); };

  const ready = (x) => {
    const p = x.p;
    if (totalStock(p) <= 0) return null;
    const pick = picks[x.id] || {};
    const colors = productColors(p);
    const color = pick.color || colors.find((c) => stockForColor(p, c) > 0) || colors[0] || undefined;
    if (hasSizeStock(p) && !pick.size) return { need: p.name };
    return { p, color, size: hasSizeStock(p) ? pick.size : undefined };
  };
  const addAll = () => {
    const list = look.pieces.map(ready).filter(Boolean);
    const need = list.find((r) => r.need);
    if (need) { setMsg({ type: 'err', text: `Pick a size for ${need.need}. · সাইজ বেছে নিন।` }); return; }
    if (!list.length) { setMsg({ type: 'err', text: 'These pieces are out of stock right now.' }); return; }
    list.forEach((r) => addToCart(r.p, r.color, r.size, 1, false));
    setMsg({ type: 'ok', text: `${list.length} piece${list.length === 1 ? '' : 's'} added to your cart. · কার্টে যোগ হয়েছে।` });
  };
  const inStock = look.pieces.filter((x) => totalStock(x.p) > 0);
  const total = inStock.reduce((n, x) => n + (Number(x.p.price) || 0), 0);
  // neighbours: the two on each side of the middle one
  const around = shown.length === 1 ? [0] : [-2, -1, 0, 1, 2].filter((d) => Math.abs(d) < shown.length || d === 0)
    .filter((d, k, arr) => arr.findIndex((e) => (i + e + shown.length * 3) % shown.length === (i + d + shown.length * 3) % shown.length) === k);

  return (
    <section className="w-full bg-white text-black border-t border-black/5" aria-label="Shop the look">
      <style>{'@keyframes kyLookBar{from{width:0}to{width:100%}}'}</style>
      <div className="max-w-[1500px] mx-auto grid lg:grid-cols-[1fr_400px]">
        <div className="relative px-4 sm:px-10 pt-10 pb-6 overflow-hidden">
          <p className="text-[11px] font-bold tracking-[0.35em] text-[#B8921F]">SHOP THE LOOK</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-serif font-bold">Wear the whole look.</h2>
          <p className="mt-2 text-sm text-gray-500">Styled head to toe from Kyvro. Tap a model, then pick your size. · পুরো লুক এক ক্লিকে।</p>

          <div className="relative h-[440px] sm:h-[560px] mt-4 select-none touch-pan-y cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => { swipe.current = e.clientX; dragged.current = false; hold(); }}
            onPointerUp={(e) => { if (swipe.current == null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 40) { dragged.current = true; go(i + (dx < 0 ? 1 : -1)); } }}
            onPointerLeave={() => { swipe.current = null; }}>
            {around.map((d) => {
              const k = (i + d + shown.length * 3) % shown.length;
              const l = shown[k];
              const mid = d === 0;
              const shift = d * (typeof window !== 'undefined' && window.innerWidth < 640 ? 62 : 72) - Math.sign(d) * (Math.abs(d) - 1) * 12;
              return (
                <button key={`${l.id}-${d}`} type="button" onClick={() => { if (dragged.current) { dragged.current = false; return; } go(k); }} aria-label={mid ? l.name || 'Look' : `Show ${l.name || 'this look'}`}
                  className="absolute bottom-0 left-1/2 h-full transition-all duration-500 ease-out"
                  style={{ transform: `translateX(calc(-50% + ${shift}%)) scale(${mid ? 1 : 0.8 - Math.abs(d) * 0.05})`, transformOrigin: 'bottom center',
                    zIndex: 10 - Math.abs(d), filter: mid ? 'none' : `blur(${Math.abs(d) * 2.5}px) saturate(0.9)`, opacity: mid ? 1 : 0.8 - Math.abs(d) * 0.2, cursor: mid ? 'default' : 'pointer' }}>
                  <span className="relative block h-full aspect-[2/3]">
                    <img src={l.image} alt={l.name || 'Look'} draggable={false} className="w-full h-full object-contain object-bottom drop-shadow-[0_18px_18px_rgba(0,0,0,0.18)]" />
                    {mid && l.pieces.map((x) => (
                      <span key={x.id} onMouseEnter={() => setHot(x.id)} onMouseLeave={() => setHot(null)} onClick={(e) => { e.stopPropagation(); setHot(x.id); }}
                        style={{ left: `${x.x}%`, top: `${x.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-md ring-4 transition ${hot === x.id ? 'bg-[#D4AF37] text-black ring-[#D4AF37]/30 scale-110' : 'bg-white text-black ring-white/40'}`}>{x.n}</span>
                    ))}
                  </span>
                </button>
              );
            })}
            <span className="absolute bottom-0 inset-x-[15%] h-6 rounded-[50%] bg-black/10 blur-xl -z-0" aria-hidden="true" />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button type="button" onClick={() => go(i - 1)} className="p-2 rounded-full border border-black/20 hover:border-black" aria-label="Previous look"><ArrowLeft size={18} /></button>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {shown.map((l, k) => (
                <button key={l.id} type="button" onClick={() => go(k)} className="min-w-[3rem] text-left">
                  <span className="block h-0.5 bg-black/15 overflow-hidden">
                    {k === i && <span key={`${at}-${playing && !hover}`} className="block h-full bg-black"
                      style={playing && !hover && count > 1 ? { animation: `kyLookBar ${SPIN}ms linear forwards` } : { width: '100%' }} />}
                  </span>
                  <span className={`block mt-1.5 text-[11px] tracking-wider whitespace-nowrap ${k === i ? 'font-bold' : 'text-gray-400'}`}>{String(k + 1).padStart(2, '0')}{k === i && l.name ? `  ${l.name}` : ''}</span>
                </button>
              ))}
            </div>
            {count > 1 && <button type="button" onClick={() => setPlaying((v) => !v)} className="p-2" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>}
            <button type="button" onClick={() => go(i + 1)} className="p-2 rounded-full border border-black/20 hover:border-black" aria-label="Next look"><ArrowRight size={18} /></button>
          </div>
        </div>

        <aside onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)} onTouchStart={hold} className="border-t lg:border-t-0 lg:border-l border-black/10 px-4 sm:px-8 py-8 flex flex-col">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold">In this look</h3>
            <span className="text-[11px] tracking-[0.2em] text-gray-500">{look.pieces.length} PIECE{look.pieces.length === 1 ? '' : 'S'}</span>
          </div>
          <div className="mt-2 flex-1">
            {look.pieces.map((x) => (
              <Piece key={x.id} n={x.n} p={x.p} pick={picks[x.id] || {}} setPick={(v) => setPicks((s) => ({ ...s, [x.id]: v }))}
                active={hot === x.id} onHover={() => setHot(x.id)} formatPrice={formatPrice}
                onAdd={() => { const r = ready(x); if (!r) return; if (r.need) { setMsg({ type: 'err', text: `Pick a size for ${r.need}. · সাইজ বেছে নিন।` }); return; } addToCart(r.p, r.color, r.size, 1, false); setMsg({ type: 'ok', text: `${r.p.name} added to your cart.` }); }} />
            ))}
          </div>
          <div className="pt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-500">Whole look{inStock.length < look.pieces.length ? ` (${inStock.length} in stock)` : ''}</span>
              <span className="text-xl font-bold">{formatPrice(total)}</span>
            </div>
            <button type="button" onClick={addAll} disabled={!inStock.length}
              className="mt-3 w-full h-12 rounded-lg bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-[#1a1a1a] disabled:opacity-40 flex items-center justify-center gap-2">
              Add full look to cart <ArrowRight size={16} />
            </button>
            {msg && <p className={`mt-2 text-xs flex items-center gap-1 ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.type === 'ok' && <Check size={13} />}{msg.text}</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}
