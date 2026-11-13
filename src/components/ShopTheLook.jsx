import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Pause, Play, X } from 'lucide-react';
import { watchLooks, getLookColor, tryLookColor } from '../looks';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { totalStock, hasSizeStock, orderedSizes, stockFor, stockForColor, productColors, imageFor } from '../data/catalog';

// Home page "Shop the Look" (Classic theme, between the Men's and Women's rails). Models (looks/{id}, made in
// Admin → Shop the Look) stand side by side: the one in the middle is sharp, the others step back. Tap a model to
// bring it forward; the panel lists the pieces it wears with price, stock, size and Add to cart (or the whole look).
// Prices come from the products the page already shows, so a shop link gets its own prices.
let cache = null; // the looks, kept for the next visit to the home page

function Piece({ n, p, pick, setPick, active, onHover, formatPrice, onAdd, onOpen, onColor }) {
  const sized = hasSizeStock(p);
  const sizes = sized ? orderedSizes(Object.keys(p.sizeStock), p.gender) : [];
  const colors = productColors(p);
  const color = pick.color || colors.find((c) => stockForColor(p, c) > 0) || colors[0] || '';
  const out = totalStock(p) <= 0;
  const left = (s) => stockFor(p, s, color);
  return (
    <div id={`look-piece-${p.id}`} onMouseEnter={onHover} className={`py-4 border-b border-black/10 flex gap-3 transition ${active ? 'bg-[#D4AF37]/10 -mx-3 px-3 rounded-lg' : ''}`}>
      <div className="relative w-20 h-24 shrink-0 rounded-md overflow-hidden bg-[#f1f1f0]">
        <button type="button" onClick={onOpen} className="block w-full h-full" aria-label={`Open ${p.name}`}>
          <img src={imageFor(p, color)} alt={p.name} loading="lazy" className={`w-full h-full object-cover hover:scale-105 transition ${out ? 'grayscale opacity-60' : ''}`} />
        </button>
        <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shadow">{n}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{p.category}</p>
        <button type="button" onClick={onOpen} className="text-left text-sm font-semibold leading-snug line-clamp-2 hover:underline">{p.name}</button>
        <p className="mt-0.5 text-sm">
          <span className="font-bold">{formatPrice(p.price)}</span>
          {p.originalPrice > p.price && <span className="ml-1.5 text-xs text-gray-400 line-through">{formatPrice(p.originalPrice)}</span>}
        </p>
        {out ? <p className="mt-1 text-xs font-bold text-red-600">Out of stock</p> : (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {colors.length > 1 && colors.map((c) => (
              <button key={c} type="button" disabled={stockForColor(p, c) <= 0} onClick={() => { setPick({ ...pick, color: c, size: '' }); if (onColor) onColor(c); }}
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

export default function ShopTheLook({ products = [], formatPrice, addToCart, openProduct }) {
  const [looks, setLooks] = useState(cache);
  useEffect(() => watchLooks((l) => { cache = l; setLooks(l); }), []);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products]);
  // only ON looks with at least one piece this page sells
  const shown = useMemo(() => (looks || []).filter((l) => l.active)
    .map((l) => ({ ...l, pieces: l.items.map((it, i) => ({ ...it, n: i + 1, p: byId[it.id] })).filter((x) => x.p) }))
    .filter((l) => l.pieces.length > 0), [looks, byId]);
  // pos = which look is in the middle (any whole number; the look is pos mod count). While dragging, drag = how far
  // (in looks) the finger / mouse has moved, so the ring follows it; on release it settles on the nearest look.
  const [pos, setPos] = useState(0);
  const [drag, setDrag] = useState(0);
  const [focus, setFocus] = useState(false); // tapped the middle model: only that look, bigger, with its dots
  // colour try-on: swap = the model in another colour (by look); offer = a colour with no picture yet (Try button)
  const [swap, setSwap] = useState({});
  const [offer, setOffer] = useState(null);
  const [trying, setTrying] = useState(null); // { at: start time } while the server makes it
  const [tryMsg, setTryMsg] = useState(null);
  const [, tick] = useState(0);
  useEffect(() => { if (!trying) return undefined; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [trying]);
  const stage = useRef(null);
  const [picks, setPicks] = useState({}); // productId -> { size, color }
  const [hot, setHot] = useState(null); // highlighted pin
  const [msg, setMsg] = useState(null);
  const swipe = useRef(null); // { x, w } where the drag started
  const dragged = useRef(false);
  const count = shown.length;
  const at = count ? ((pos % count) + count) % count : 0;
  useEffect(() => { setMsg(null); setHot(null); if (!trying) { setOffer(null); setTryMsg(null); } }, [at]); // eslint-disable-line react-hooks/exhaustive-deps
  // turns by itself every 10 s; stops while the visitor is in the pieces panel (picking a size), for 8 s after they touch it, or with Pause
  const SPIN = 10000;
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const holdUntil = useRef(0);
  useEffect(() => {
    if (!playing || hover || focus || trying || count < 2) return undefined;
    const t = setInterval(() => { if (Date.now() > holdUntil.current && !swipe.current) setPos((v) => v + 1); }, SPIN);
    return () => clearInterval(t);
  }, [playing, hover, focus, trying, count]);
  const hold = () => { holdUntil.current = Date.now() + 8000; };
  if (!shown.length) return null;
  const i = Math.min(at, shown.length - 1);
  const look = shown[i];
  // turn the shortest way round to look k
  const wrap = (o) => { const n = count; let v = ((o % n) + n) % n; if (v > n / 2) v -= n; return v; };
  const go = (k) => { hold(); setFocus(false); setPos((v) => v + wrap(k - v)); };
  const step = (d) => { hold(); setFocus(false); setPos((v) => v + d); };
  const down = (e) => {
    if (focus || count < 2) return;
    swipe.current = { x: e.clientX, w: (stage.current && stage.current.offsetWidth) || 600 };
    dragged.current = false; hold();
  };
  const move = (e) => {
    if (!swipe.current) return;
    const dx = e.clientX - swipe.current.x;
    if (Math.abs(dx) > 6 && !dragged.current) { dragged.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ } }
    if (dragged.current) setDrag(-dx / (swipe.current.w * 0.32));
  };
  const up = () => {
    if (!swipe.current) return;
    swipe.current = null;
    setPos((v) => v + Math.round(drag)); setDrag(0); hold();
  };
  // a colour picked in the panel: show the model in it if that picture exists, else offer to make it
  const pickColor = async (lk, x, color) => {
    hold(); setTryMsg(null);
    const img = await getLookColor(lk.id, x.id, color);
    if (img) { setSwap((s) => ({ ...s, [lk.id]: { image: img, label: `${x.p.name} · ${color}` } })); setOffer(null); return; }
    setOffer({ lookId: lk.id, productId: x.id, color, name: x.p.name });
  };
  const makeColor = async () => {
    if (!offer || trying) return;
    // the login may still be loading right after the page opens: wait for it before asking to sign in
    try { if (auth.authStateReady) await auth.authStateReady(); } catch (e) { /* old SDK */ }
    if (!auth.currentUser) {
      try { await signInWithPopup(auth, googleProvider); } catch (e) { setTryMsg({ type: 'err', text: 'Sign in with Google to try colours on the model.' }); return; }
    }
    const o = offer; setTrying({ at: Date.now() }); setTryMsg(null); hold();
    try {
      const j = await tryLookColor(o.lookId, o.productId, o.color);
      setSwap((s) => ({ ...s, [o.lookId]: { image: j.image, label: `${o.name} · ${o.color}` } }));
      setOffer(null);
      if (typeof j.left === 'number') setTryMsg({ type: 'ok', text: `${j.left} colour tries left today. · আজ আরও ${j.left}টি।` });
    } catch (e) { setTryMsg({ type: 'err', text: e.message }); }
    setTrying(null);
  };
  const pinTap = (x) => {
    setHot(x.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      const el = document.getElementById(`look-piece-${x.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
  // the ring: each look sits at an angle from the middle; the far ones get smaller, softer and further back
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const ringOf = (k) => {
    const o = count < 2 ? 0 : wrap(k - (pos + drag));
    const a = Math.max(-1.45, Math.min(1.45, o * 0.72));
    return { o, x: Math.sin(a) * (narrow ? 105 : 120), y: -Math.min(Math.abs(o), 2) * 2, scale: Math.max(0.5, 1 - Math.abs(o) * 0.2),
      blur: Math.min(Math.abs(o), 2.2) * 2.4, opacity: Math.max(0, 1 - Math.abs(o) * 0.32), z: 100 - Math.round(Math.abs(o) * 10) };
  };

  return (
    <section className="w-full bg-white text-black border-t border-black/5" aria-label="Shop the look">
      <style>{'@keyframes kyLookBar{from{width:0}to{width:100%}}@keyframes fadeIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}'}</style>
      <div className="max-w-[1500px] mx-auto grid lg:grid-cols-[1fr_400px]">
        <div className="relative px-4 sm:px-10 pt-10 pb-6 overflow-hidden">
          <p className="text-[11px] font-bold tracking-[0.35em] text-[#B8921F]">SHOP THE LOOK</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-serif font-bold">Wear the whole look.</h2>
          <p className="mt-2 text-sm text-gray-500">Styled head to toe from Kyvro. Drag to turn, tap a model to see each piece. · ঘুরিয়ে দেখুন, মডেলে ট্যাপ করুন।</p>

          <div ref={stage} className={`relative mt-4 select-none touch-pan-y transition-[height] duration-500 ${focus ? 'h-[620px] sm:h-[820px]' : 'h-[440px] sm:h-[560px] cursor-grab active:cursor-grabbing'}`}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {!focus && shown.map((l, k) => {
              const r = ringOf(k);
              if (Math.abs(r.o) > 2.6) return null;
              const mid = Math.abs(r.o) < 0.5;
              return (
                <button key={l.id} type="button" aria-label={mid ? `Open ${l.name || 'this look'}` : `Show ${l.name || 'this look'}`}
                  onClick={() => { if (dragged.current) { dragged.current = false; return; } if (k === at) { setFocus(true); hold(); } else go(k); }}
                  className="absolute bottom-0 left-1/2 h-full"
                  style={{ transform: `translateX(calc(-50% + ${r.x}%)) translateY(${r.y}%) scale(${r.scale})`, transformOrigin: 'bottom center', zIndex: r.z,
                    filter: r.blur > 0.2 ? `blur(${r.blur}px) saturate(0.9)` : 'none', opacity: r.opacity,
                    transition: drag ? 'none' : 'transform 0.7s cubic-bezier(.22,.8,.3,1), filter 0.7s, opacity 0.7s' }}>
                  <span className="relative block h-full aspect-[2/3]">
                    <img src={(swap[l.id] && swap[l.id].image) || l.image} alt={l.name || 'Look'} draggable={false} className="w-full h-full object-contain object-bottom drop-shadow-[0_18px_18px_rgba(0,0,0,0.18)] pointer-events-none" />
                    {mid && !drag && l.pieces.map((x) => (
                      <span key={x.id} className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 text-black text-[10px] font-bold flex items-center justify-center shadow ring-4 ring-white/30"
                        style={{ left: `${x.x}%`, top: `${x.y}%` }}>{x.n}</span>
                    ))}
                    {mid && !drag && <span className="absolute left-1/2 -translate-x-1/2 bottom-[46%] px-3 py-1 rounded-full bg-black/70 text-white text-[10px] font-bold tracking-[0.2em] opacity-0 hover:opacity-100 transition">VIEW</span>}
                  </span>
                </button>
              );
            })}
            {focus && (
              <div className="absolute inset-0 bg-white z-[200] animate-[fadeIn_.3s_ease]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] tracking-[0.3em] text-gray-500">LOOK {String(at + 1).padStart(2, '0')}</p>
                    <p className="text-xl font-bold">{look.name || 'The look'}</p>
                  </div>
                  <button type="button" onClick={() => setFocus(false)} className="w-12 h-12 rounded-full border border-black/20 hover:border-black flex items-center justify-center" aria-label="Back to all looks"><X size={20} /></button>
                </div>
                <div className="absolute inset-x-0 top-12 bottom-6 flex justify-center">
                  <span className="relative block h-full aspect-[2/3]">
                    <img src={(swap[look.id] && swap[look.id].image) || look.image} alt={look.name || 'Look'} draggable={false} className="w-full h-full object-contain object-bottom drop-shadow-[0_18px_18px_rgba(0,0,0,0.18)]" />
                    {look.pieces.map((x) => (
                      <button key={x.id} type="button" onMouseEnter={() => setHot(x.id)} onClick={() => pinTap(x)} aria-label={`${x.n}: ${x.p.name}`}
                        style={{ left: `${x.x}%`, top: `${x.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-[6px] transition ${hot === x.id ? 'bg-[#D4AF37] text-black ring-[#D4AF37]/30 scale-110' : 'bg-white text-black ring-white/50 hover:scale-110'}`}>{x.n}</button>
                    ))}
                  </span>
                </div>
                <p className="absolute bottom-0 inset-x-0 text-center text-[11px] tracking-[0.3em] text-gray-500">TAP A DOT TO SHOP THE PIECE</p>
              </div>
            )}
            {trying && (
              <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
                <div className="px-5 py-3 rounded-2xl bg-white/90 backdrop-blur shadow-xl text-center">
                  <p className="text-sm font-bold">Dressing the model in {offer ? offer.color : 'the new colour'}…</p>
                  <p className="text-xs text-gray-500 mt-0.5">⏱ {Math.floor((Date.now() - trying.at) / 1000)} s · about 30-60 s · একটু অপেক্ষা করুন</p>
                  <div className="mt-2 h-1 rounded-full bg-black/10 overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all duration-1000" style={{ width: `${Math.min(95, ((Date.now() - trying.at) / 50000) * 90)}%` }} /></div>
                </div>
              </div>
            )}
            {(offer || (swap[look.id] && !trying) || tryMsg) && !drag && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-[250] flex flex-col items-center gap-1.5 w-[min(92%,420px)]">
                {offer && !trying && offer.lookId === look.id && (
                  <button type="button" onClick={makeColor} className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold shadow-lg hover:bg-[#1a1a1a]">
                    ✨ See it in {offer.color} on the model{auth.currentUser ? '' : ' (sign in)'}
                  </button>
                )}
                {swap[look.id] && !trying && (
                  <button type="button" onClick={() => setSwap((s) => { const n = { ...s }; delete n[look.id]; return n; })} className="px-3 py-1 rounded-full bg-white/90 border border-black/10 text-[11px] font-semibold shadow">
                    Showing {swap[look.id].label} · ↺ Original
                  </button>
                )}
                {tryMsg && <p className={`px-3 py-1 rounded-full bg-white/90 text-[11px] font-semibold shadow ${tryMsg.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{tryMsg.text}</p>}
              </div>
            )}
            <span className="absolute bottom-0 inset-x-[15%] h-6 rounded-[50%] bg-black/10 blur-xl -z-0" aria-hidden="true" />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button type="button" onClick={() => step(-1)} className="p-2 rounded-full border border-black/20 hover:border-black" aria-label="Previous look"><ArrowLeft size={18} /></button>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {shown.map((l, k) => (
                <button key={l.id} type="button" onClick={() => go(k)} className="min-w-[3rem] text-left">
                  <span className="block h-0.5 bg-black/15 overflow-hidden">
                    {k === i && <span key={`${pos}-${playing && !hover && !focus}`} className="block h-full bg-black"
                      style={playing && !hover && !focus && count > 1 ? { animation: `kyLookBar ${SPIN}ms linear forwards` } : { width: '100%' }} />}
                  </span>
                  <span className={`block mt-1.5 text-[11px] tracking-wider whitespace-nowrap ${k === i ? 'font-bold' : 'text-gray-400'}`}>{String(k + 1).padStart(2, '0')}{k === i && l.name ? `  ${l.name}` : ''}</span>
                </button>
              ))}
            </div>
            {count > 1 && <button type="button" onClick={() => setPlaying((v) => !v)} className="p-2" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>}
            <button type="button" onClick={() => step(1)} className="p-2 rounded-full border border-black/20 hover:border-black" aria-label="Next look"><ArrowRight size={18} /></button>
          </div>
        </div>

        <aside onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)} onTouchStart={hold} className="border-t lg:border-t-0 lg:border-l border-black/10 px-4 sm:px-8 py-8 flex flex-col">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold">In this look</h3>
            <span className="text-[11px] tracking-[0.2em] text-gray-500">{look.pieces.length} PIECE{look.pieces.length === 1 ? '' : 'S'}</span>
          </div>
          <div className="mt-2 flex-1">
            {look.pieces.map((x) => (
              <Piece key={x.id} n={x.n} p={x.p} onOpen={() => openProduct && openProduct(x.p)} pick={picks[x.id] || {}} setPick={(v) => setPicks((s) => ({ ...s, [x.id]: v }))} onColor={(c) => pickColor(look, x, c)}
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
