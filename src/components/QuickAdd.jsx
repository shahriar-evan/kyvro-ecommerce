import React, { useState } from 'react';
import { X } from 'lucide-react';
import { hasSizeStock, hasColorStock, orderedSizes, productColors, stockFor, stockForColor, stockForSize, totalStock } from '../data/catalog';

// Small window that opens from the product cards: choose size, color and quantity, then add to cart / buy now.
export default function QuickAdd({ product, goCheckout, onConfirm, onClose, formatPrice, isDarkMode }) {
  const sized = hasSizeStock(product);
  const byColor = hasColorStock(product);
  const sizes = sized ? orderedSizes(Object.keys(product.sizeStock), product.gender) : [];
  const colors = productColors(product);

  const colorLeft = (s, c) => (sized ? (s ? stockFor(product, s, c) : stockForColor(product, c)) : stockFor(product, '', c));
  const firstColorFor = (s) => colors.find((c) => colorLeft(s, c) > 0) || colors[0] || '';

  const [size, setSize] = useState('');
  const [color, setColor] = useState(byColor ? firstColorFor('') : (colors[0] || ''));
  const [qty, setQty] = useState(1);

  const needsSize = sized && !size;
  const available = byColor
    ? (needsSize ? 0 : stockFor(product, size, color))
    : (sized ? (size ? stockForSize(product, size) : 0) : totalStock(product));
  const canBuy = !needsSize && available > 0;

  const pickSize = (s) => {
    setSize(s);
    setQty(1);
    if (byColor && colorLeft(s, color) <= 0) setColor(firstColorFor(s));
  };
  const pickColor = (c) => { setColor(c); setQty(1); };

  const btn = (active, disabled) =>
    `min-w-[3rem] px-3 py-2 text-xs rounded border transition ${
      disabled
        ? 'opacity-40 line-through cursor-not-allowed border-gray-300 dark:border-gray-700'
        : active
          ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
          : (isDarkMode ? 'border-gray-700 hover:border-[#D4AF37]' : 'border-gray-300 hover:border-[#D4AF37]')
    }`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl p-5 space-y-4 ${isDarkMode ? 'bg-[#161616] text-gray-100' : 'bg-white text-gray-900'}`}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 text-gray-500 hover:text-[#D4AF37]" aria-label="Close"><X size={20} /></button>

        <div className="flex gap-3 pr-6">
          <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded" />
          <div className="min-w-0">
            <h3 className="font-serif font-bold leading-snug">{product.name}</h3>
            <p className="text-[#D4AF37] font-bold mt-1">{formatPrice(product.price)}</p>
          </div>
        </div>

        {colors.length > 1 && (
          <div>
            <p className="text-xs font-semibold mb-2">Color: <span className="font-normal text-gray-500">{color}</span></p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const out = byColor && colorLeft(size, c) <= 0;
                return <button key={c} type="button" disabled={out} onClick={() => pickColor(c)} className={btn(color === c, out)} title={out ? 'Out of stock' : undefined}>{c}</button>;
              })}
            </div>
          </div>
        )}

        {sized && (
          <div>
            <p className="text-xs font-semibold mb-2">Size: <span className="font-normal text-gray-500">{size || 'select a size'}</span></p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const left = stockForSize(product, s);
                return (
                  <button key={s} type="button" disabled={left <= 0} onClick={() => pickSize(s)} className={btn(size === s, left <= 0)} title={left <= 0 ? 'Out of stock' : `${left} available`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className={`text-sm font-bold ${canBuy ? 'text-green-600' : (needsSize ? 'text-gray-500 font-semibold' : 'text-red-600')}`}>
          {needsSize ? 'Select a size to see how many are available' : available > 0 ? `\u2713 ${available} available${size ? ` in size ${size}` : ''}${byColor && color ? `, ${color}` : ''}` : 'Out of Stock for this choice'}
        </p>

        <div className="flex items-center gap-3">
          <div className={`flex items-center border rounded ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-sm">&minus;</button>
            <span className="px-4 text-sm font-semibold">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(Math.max(available, 1), q + 1))} disabled={!canBuy || qty >= available} className="px-3 py-2 text-sm disabled:opacity-40">+</button>
          </div>
          <button
            type="button"
            disabled={!canBuy}
            onClick={() => onConfirm(product, color || undefined, sized ? size : undefined, qty, goCheckout)}
            className="flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {needsSize ? 'Select a size' : goCheckout ? 'Buy Now' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
