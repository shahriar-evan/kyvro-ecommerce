import React, { useState } from 'react';
import { MessageCircle, Heart } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../data/shopConfig';
import StockLabel from './StockLabel';
import { hasSizeStock, hasColorStock, totalStock, stockForSize, stockFor, stockForColor, productColors, orderedSizes } from '../data/catalog';

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
    setQty(1);
  };
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
    `min-w-[3rem] px-3 py-2 text-xs rounded border transition ${
      disabled
        ? 'opacity-40 line-through cursor-not-allowed border-gray-300 dark:border-gray-700'
        : active
          ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
          : (isDarkMode ? 'border-gray-700 hover:border-[#D4AF37]' : 'border-gray-300 hover:border-[#D4AF37]')
    }`;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      <button onClick={() => setCurrentView('shop')} className="text-xs text-gray-500 hover:text-[#D4AF37] mb-6">&larr; Back to shop</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className={`relative rounded-lg overflow-hidden border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
          <img src={live.image} alt={live.name} className="w-full h-full max-h-[560px] object-cover" />
          <button
            type="button"
            onClick={() => toggleSaved(live.id)}
            title={savedIds.includes(live.id) ? 'Remove from saved items' : 'Save this item'}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 text-black shadow flex items-center justify-center hover:scale-110 transition"
          >
            <Heart size={18} className={savedIds.includes(live.id) ? 'fill-red-500 text-red-500' : ''} />
          </button>
          {soldOut && <span className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded">SOLD OUT</span>}
          {!soldOut && discount > 0 && <span className="absolute top-3 left-3 bg-[#D4AF37] text-black text-[11px] font-bold px-3 py-1 rounded">-{discount}%</span>}
        </div>

        <div className="space-y-5">
          <div>
            <span className="text-[11px] text-[#D4AF37] uppercase tracking-wider">{live.gender === live.category ? live.category : `${live.gender} / ${live.category}`}</span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-1">{live.name}</h1>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-2xl font-bold text-[#D4AF37]">{formatPrice(live.price)}</span>
            {live.originalPrice > live.price && <span className="text-sm text-gray-500 line-through">{formatPrice(live.originalPrice)}</span>}
          </div>

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

          <StockLabel count={total} className="!text-base" />

          {sized && (
            <div>
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
                className="flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsSize ? 'Select a size' : colorOut ? 'Out of stock' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={needsSize || colorOut}
                className={`flex-1 font-bold py-3 rounded text-xs uppercase tracking-widest border-2 border-[#D4AF37] transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'text-[#D4AF37] hover:bg-[#D4AF37]/10' : 'text-black hover:bg-[#D4AF37]/10'}`}
              >
                Buy Now
              </button>
            </div>
          )}
          {!soldOut && (
            <a
              href={waNeedsSize ? undefined : waLink}
              onClick={(e) => { if (waNeedsSize) { e.preventDefault(); alert('Please select a size first.'); } }}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center justify-center gap-2 shadow"
            >
              <MessageCircle size={16} /> Order on WhatsApp
            </a>
          )}
          {soldOut && <p className="text-sm font-bold text-red-500">This product is currently sold out.</p>}
        </div>
      </div>
    </div>
  );
}
