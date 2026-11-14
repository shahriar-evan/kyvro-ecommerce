import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { hasSizeStock, stockFor, totalStock, orderedSizes, productColors, imageFor } from '../data/catalog';
import PriceTag from './PriceTag';
import { Hanger } from './HangerRail';

// Full-screen "look closer" view for the home showcase (HangerRail / ShoeOrbit).
// Add to cart uses the store's normal cart (drawer -> checkout -> payment).
export default function RailQuickView({ items, index, setIndex, onClose, formatPrice, addToCart, openProduct, hanging = true }) {
  const p = items[index];
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [photo, setPhoto] = useState(0);

  const colors = productColors(p);
  useEffect(() => { setSize(null); setColor(p && p.cutoutColor && colors.includes(p.cutoutColor) ? p.cutoutColor : (colors.length > 1 ? null : colors[0] || null)); setPhoto(0); }, [p && p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') setIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = old; };
  }, [index, items.length, onClose, setIndex]);

  const photos = useMemo(() => {
    if (!p) return [];
    // the background-free picture first while the colour in it is the chosen one
    // (a home page photo uploaded in Admin has no colour saved, so once a colour with its own photo is picked, that photo shows)
    const ownPhoto = !!(color && p.colorImages && p.colorImages[color]);
    const main = p.cutout && (!color || color === p.cutoutColor || !ownPhoto) ? p.cutout : imageFor(p, color);
    // more background-free angles (Admin "More photos") come right after it
    const more = main === p.cutout ? (p.cutoutExtra || []) : [];
    const rest = (Array.isArray(p.images) ? p.images : []).filter((u) => u && u !== main);
    return [main, ...more, ...rest].slice(0, 6);
  }, [p, color]);

  if (!p) return null;
  const isCut = (u) => !!u && (u === p.cutout || (p.cutoutExtra || []).includes(u));
  const sizes = Array.isArray(p.sizes) ? orderedSizes(p.sizes.filter(Boolean), p.gender) : [];
  const inStock = (s) => (hasSizeStock(p) ? stockFor(p, s, color) > 0 : true);
  const needSize = sizes.length > 0 && !size;
  const needColor = colors.length > 1 && !color;
  const soldOut = totalStock(p) <= 0;
  const add = (goCheckout) => {
    onClose();
    addToCart(p, color || undefined, size || undefined, 1, goCheckout);
  };
  const btnText = soldOut ? 'Sold out' : needColor ? 'Select a colour' : needSize ? 'Select a size' : 'Add to cart';
  const blocked = soldOut || needSize || needColor;

  return (
    <div className="fixed inset-0 z-[65] isolate overflow-y-auto bg-[#f2f1ef] text-black kyvro-fade" role="dialog" aria-modal="true" aria-label={p.name}>
      <button type="button" onClick={onClose} aria-label="Go back" title="Back"
        className="fixed left-4 top-4 sm:left-8 sm:top-6 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#D4AF37] text-black shadow-lg transition hover:scale-110 active:scale-95">
        <ArrowLeft size={20} />
      </button>
      <button type="button" onClick={onClose} className="fixed right-4 top-4 sm:right-8 sm:top-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm backdrop-blur hover:bg-white">
        Close <X size={18} />
      </button>

      <div className="mx-auto grid min-h-full max-w-6xl grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-12 px-5 sm:px-10 pt-16 pb-10">
        {/* left: the product, big */}
        <div className="flex flex-col items-center">
          {hanging && (p.cutout && p.cutoutHanger && photos[photo] === p.cutout ? (
            <span className="block h-10 sm:h-16 w-px bg-gray-400" />
          ) : (
            <>
              <span className="block h-10 sm:h-16 w-px bg-gray-400" />
              <Hanger className="-mt-1 w-40 sm:w-56" />
            </>
          ))}
          <div className="-mt-1 w-full max-w-[420px] aspect-[4/5]">
            <img src={photos[photo] || p.image} alt={p.name} draggable={false}
              className={`h-full w-full object-contain ${isCut(photos[photo]) ? (hanging ? 'object-top' : 'object-center') : 'mix-blend-multiply'} drop-shadow-[0_28px_30px_rgba(0,0,0,.18)]`} />
          </div>
          {photos.length > 1 && (
            <div className="mt-4 flex gap-2">
              {photos.map((u, i) => (
                <button key={u + i} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}
                  className={`h-14 w-14 overflow-hidden rounded-lg border bg-white ${photo === i ? 'border-black' : 'border-gray-200'}`}>
                  <img src={u} alt="" className={`h-full w-full ${isCut(u) ? 'object-contain p-1' : 'object-cover'}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* right: details */}
        <div className="w-full max-w-md md:justify-self-start">
          <p className="text-[11px] tracking-[0.25em] text-gray-500">{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">{p.name}</h2>
          <div className="mt-2"><PriceTag price={p.price} originalPrice={p.originalPrice} formatPrice={formatPrice} isDarkMode={false} /></div>

          {colors.length > 1 && (
            <>
              <p className="mt-6 text-[11px] tracking-[0.2em] text-gray-500">COLOUR</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c} type="button" onClick={() => { setColor(c); setPhoto(0); setSize(null); }}
                    className={`rounded-full border px-3.5 py-1.5 text-xs transition duration-300 ${color === c ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'}`}>{c}</button>
                ))}
              </div>
            </>
          )}

          {sizes.length > 0 && (
            <>
              <p className="mt-6 text-[11px] tracking-[0.2em] text-gray-500">SIZE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const ok = inStock(s);
                  return (
                    <button key={s} type="button" disabled={!ok} onClick={() => setSize(s)}
                      className={`min-w-[44px] h-11 rounded-full border px-3 text-sm transition duration-300 ${size === s ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:border-black'} disabled:opacity-30 disabled:line-through disabled:cursor-not-allowed`}>{s}</button>
                  );
                })}
              </div>
            </>
          )}

          <button type="button" disabled={blocked} onClick={() => add(false)}
            className="mt-7 w-full rounded-full bg-black py-3.5 text-sm font-bold text-white transition duration-300 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed">
            {btnText}
          </button>
          {!blocked && (
            <button type="button" onClick={() => add(true)} className="mt-2 w-full rounded-full border border-black py-3 text-sm font-semibold transition duration-300 hover:bg-black hover:text-white">
              Buy now
            </button>
          )}

          <div className="mt-7 flex items-center justify-between gap-4 border-t border-black/10 pt-4 text-sm">
            <span className="line-clamp-1 text-gray-600">{p.category}</span>
            <button type="button" onClick={() => { onClose(); openProduct(p); }} className="shrink-0 font-semibold underline-offset-4 hover:underline">View product page</button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button type="button" aria-label="Previous" onClick={() => setIndex((index - 1 + items.length) % items.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white hover:border-black"><ArrowLeft size={18} /></button>
            <button type="button" aria-label="Next" onClick={() => setIndex((index + 1) % items.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white hover:border-black"><ArrowRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
