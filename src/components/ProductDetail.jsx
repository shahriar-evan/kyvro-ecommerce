import PriceTag, { DiscountBadge } from './PriceTag';
import React, { useState, useRef } from 'react';
import { Heart } from 'lucide-react';
import WhatsAppButton, { WhatsAppIcon } from './WhatsAppButton';
import useSwipe from '../utils/useSwipe';
import { WHATSAPP_NUMBER } from '../data/shopConfig';
import StockLabel from './StockLabel';
import { hasSizeStock, hasColorStock, totalStock, stockForSize, stockFor, stockForColor, productColors, imageFor, orderedSizes } from '../data/catalog';

export default function ProductDetail({ product, products, addToCart, calculateDiscountPercent, formatPrice, isDarkMode, setCurrentView, savedIds = [], toggleSaved = () => {} }) {
  // Always use the latest version of the product (admin may have changed stock)
  const live = (products || []).find((p) => p.id === product.id) || product;
  const sized = hasSizeStock(live);
  const sizes = sized ? orderedSizes(Object.keys(live.sizeStock), live.gender) : [];
  const colors = productColors(live);
  const byColor = hasColorStock(live);

  // how many of a color are left (for the chosen size, or in total while no size is chosen yet)
  const colorLeftFor = (s, c) => (sized ? (s ? stockFor(live, s, c) : stockForColor(live, c)) : stockFor(live, '', c));
  const firstColorFor = (s) => colors.find((c) => colorLeftFor(s, c) > 0) || colors[0] || '';

  const [size, setSize] = useState('');
  const [color, setColor] = useState(byColor ? firstColorFor('') : (colors[0] || ''));
  const [qty, setQty] = useState(1);
  const sizeRef = useRef(null);

  // photo gallery: the main photo + the photo of each color. Swipe sideways to change.
  // order: main photo, then each color's photos together (its main photo, then its extra ones), then the product's extra photos
  const colorOrder = Object.keys({ ...(live.colorImages || {}), ...(live.colorGallery || {}) });
  const gallery = [...new Set([live.image, ...colorOrder.flatMap((c) => [(live.colorImages || {})[c], ...(((live.colorGallery || {})[c]) || [])]), ...(Array.isArray(live.images) ? live.images : [])].filter(Boolean))];
  const [manualIdx, setManualIdx] = useState(null); // null = show the photo of the chosen color
  const colorPhoto = imageFor(live, color);
  const currentIdx = manualIdx !== null ? Math.min(manualIdx, gallery.length - 1) : Math.max(0, gallery.indexOf(colorPhoto));
  const shownPhoto = gallery[currentIdx] || colorPhoto;
  const goPhoto = (d) => { if (gallery.length > 1) setManualIdx((currentIdx + d + gallery.length) % gallery.length); };
  const photoSwipe = useSwipe(() => goPhoto(1), () => goPhoto(-1));

  const total = totalStock(live);
  const available = byColor
    ? (sized && !size ? 0 : stockFor(live, size, color))
    : (sized ? (size ? stockForSize(live, size) : 0) : total);
  const soldOut = total <= 0;
  const discount = calculateDiscountPercent(live.price, live.originalPrice);
  const needsSize = sized && !size;

  const pickSize = (s) => {
    setSize(s);
    setQty(1);
    // if the chosen color is finished in this size, move to a color that is still available
    if (byColor && colorLeftFor(s, color) <= 0) setColor(firstColorFor(s));
  };
  const pickColor = (c) => {
    setColor(c);
    setManualIdx(null);
    setQty(1);
  };
  // the green line follows the choice: size M + blue -> only the pieces of M blue
  const labelCount = byColor
    ? (sized ? (size ? stockFor(live, size, color) : (color ? stockForColor(live, color) : total)) : stockFor(live, '', color))
    : (sized && size ? stockForSize(live, size) : total);
  const colorOut = byColor && !needsSize && available <= 0;

  const handleAdd = () => {
    if (soldOut || needsSize || colorOut) return;
    addToCart(live, color || undefined, sized ? size : (live.sizes && live.sizes[0]), qty);
  };

  const handleBuyNow = () => {
    if (soldOut || needsSize || colorOut) return;
    addToCart(live, color || undefined, sized ? size : (live.sizes && live.sizes[0]), qty, true);
  };

  // WhatsApp message carries the size / color / quantity the customer picked
  const waLines = [
    'Hello Kyvro, I want to order:',
    `* Name: ${live.name}`,
    ...(color ? [`* Color: ${color}`] : []),
    ...(sized && size ? [`* Size: ${size}`] : []),
    `* Quantity: ${qty}`,
    `* Price: ${formatPrice(live.price)}`,
  ];
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waLines.join('\n'))}`;
  const waNeedsSize = needsSize;

  const cardBtn = (active, disabled) =>
    `min-w-[3.5rem] h-12 sm:h-auto px-4 sm:px-3 py-2 text-sm sm:text-xs rounded-lg sm:rounded border transition active:scale-95 ${
      disabled
        ? 'opacity-40 line-through cursor-not-allowed border-gray-300 dark:border-gray-700'
        : active
          ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
          : (isDarkMode ? 'border-gray-700 hover:border-[#D4AF37]' : 'border-gray-300 hover:border-[#D4AF37]')
    }`;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 md:py-12 w-full">
      <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-6">&larr; Back to shop</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div {...photoSwipe} className={`relative self-start md:sticky md:top-28 rounded-lg overflow-hidden border select-none ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
          <img src={shownPhoto} alt={live.name} draggable={false} className="block w-full h-auto max-h-[560px] object-contain mx-auto" />
          {gallery.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center gap-1.5">
              {gallery.map((_, i) => (
                <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => setManualIdx(i)} className={`h-2 rounded-full transition-all ${i === currentIdx ? 'w-5 bg-[#D4AF37]' : 'w-2 bg-white/70'}`} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => toggleSaved(live.id)}
            title={savedIds.includes(live.id) ? 'Remove from saved items' : 'Save this item'}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition"
          >
            <Heart size={18} className={savedIds.includes(live.id) ? 'fill-red-500 text-red-500' : ''} />
          </button>
          {soldOut && <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded">SOLD OUT</span>}
          {!soldOut && discount > 0 && <DiscountBadge price={live.price} originalPrice={live.originalPrice} className="absolute top-3 left-3" />}
        </div>

        <div className="space-y-5">
          <div>
            <span className="text-[11px] text-[#D4AF37] uppercase tracking-wider">{live.gender === live.category ? live.category : `${live.gender} / ${live.category}`}</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-1">{live.name}</h1>
          </div>

          <PriceTag price={live.price} originalPrice={live.originalPrice} formatPrice={formatPrice} isDarkMode={isDarkMode} size="lg" />

          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{live.description}</p>

          {colors.length > 1 && (
            <div>
              <p className="text-xs font-semibold mb-2">Color: <span className="font-normal text-gray-500">{color}</span></p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const out = byColor && colorLeftFor(size, c) <= 0;
                  return <button key={c} disabled={out} onClick={() => pickColor(c)} className={cardBtn(color === c, out)} title={out ? 'Out of stock' : undefined}>{c}</button>;
                })}
              </div>
            </div>
          )}

          <StockLabel count={labelCount} text={product.stockText} className="!text-base" />

          {sized && (
            <div ref={sizeRef} className="scroll-mt-24">
              <p className="text-xs font-semibold mb-2">
                Size: <span className="font-normal text-gray-500">{size || 'select a size'}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const left = stockForSize(live, s);
                  return (
                    <button key={s} disabled={left <= 0} onClick={() => pickSize(s)} className={cardBtn(size === s, left <= 0)} title={left <= 0 ? 'Out of stock' : `${left} available`}>
                      <span className="block">{s}</span>
                      {left > 0 && left <= 5 && <span className="block text-[9px] opacity-80">{left} left</span>}
                    </button>
                  );
                })}
              </div>
              {size && <p className="text-xs font-semibold text-gray-500 mt-2">{available} available in size {size}{byColor && color ? `, ${color}` : ''}</p>}
            </div>
          )}

          {byColor && !sized && color && !soldOut && <p className="text-xs font-semibold text-gray-500">{available} available in {color}</p>}
          {!sized && !soldOut && total <= 5 && <p className="text-xs font-semibold text-orange-600">Hurry! Only {total} left.</p>}

          {!soldOut && (
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center border rounded ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-sm">−</button>
                <span className="px-4 text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(Math.max(available, 1), q + 1))} disabled={needsSize || qty >= available} className="px-3 py-2 text-sm disabled:opacity-40">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={needsSize || colorOut}
                className="hidden md:block flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsSize ? 'Select a size' : colorOut ? 'Out of stock' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={needsSize || colorOut}
                className={`hidden md:block flex-1 font-bold py-3 rounded text-xs uppercase tracking-widest border-2 border-[#D4AF37] transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'text-[#D4AF37] hover:bg-[#D4AF37]/10' : 'text-black hover:bg-[#D4AF37]/10'}`}
              >
                Buy Now
              </button>
            </div>
          )}
          {!soldOut && (
            <WhatsAppButton
              href={waNeedsSize ? undefined : waLink}
              onClick={(e) => { if (waNeedsSize) { e.preventDefault(); alert('Please select a size first.'); } }}
            />
          )}
          {soldOut && <p className="text-sm font-bold text-red-500">This product is currently sold out.</p>}
        </div>
      </div>

      {/* Phone only: the buy buttons stay at the bottom of the screen while the customer scrolls */}
      {!soldOut && (
        <div className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center gap-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] ${isDarkMode ? 'bg-[#121212]/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
          <div className="leading-tight pr-1 min-w-[4.5rem]">
            <p className="text-[10px] text-gray-500">{qty > 1 ? `Total (${qty})` : 'Price'}</p>
            <p className="text-base font-bold text-[#D4AF37]">{formatPrice(live.price * qty)}</p>
          </div>
          <button
            onClick={needsSize ? () => sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) : handleAdd}
            disabled={colorOut}
            className="flex-1 h-12 rounded-lg bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition disabled:opacity-50"
          >
            {needsSize ? 'Select size' : colorOut ? 'Out of stock' : 'Add to Cart'}
          </button>
          <button
            onClick={needsSize ? () => sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) : handleBuyNow}
            disabled={colorOut}
            className={`flex-1 h-12 rounded-lg border-2 border-[#D4AF37] font-bold text-xs uppercase tracking-wider active:scale-95 transition disabled:opacity-50 ${isDarkMode ? 'text-[#D4AF37]' : 'text-black'}`}
          >
            Buy Now
          </button>
          <a
            href={waNeedsSize ? undefined : waLink}
            onClick={(e) => { if (waNeedsSize) { e.preventDefault(); sizeRef.current && sizeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Order on WhatsApp"
            className="w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br from-[#128C7E] to-[#25D366] text-white flex items-center justify-center shadow active:scale-95 transition"
          >
            <WhatsAppIcon size={22} />
          </a>
        </div>
      )}
    </div>
  );
}
