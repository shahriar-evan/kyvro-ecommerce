import React from 'react';

// Discount % from the price and the original (crossed-out) price. 0 when there is no discount.
export const discountPct = (price, originalPrice) => {
  const p = Number(price) || 0;
  const o = Number(originalPrice) || 0;
  return o > p && p > 0 ? Math.round(((o - p) / o) * 100) : 0;
};

// Red "-24% OFF" tag that sits on the product photo (replaces the plain "SALE" tag)
export function DiscountBadge({ price, originalPrice, className = '' }) {
  const pct = discountPct(price, originalPrice);
  if (!pct) return null;
  return (
    <span className={`inline-flex items-baseline gap-1 bg-gradient-to-br from-red-600 to-rose-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-md shadow-lg shadow-red-900/30 tracking-wide ${className}`}>
      -{pct}%
      <span className="text-[8px] font-bold tracking-[0.2em] opacity-90">OFF</span>
    </span>
  );
}

// Price block: the selling price big and bold (red when it is a sale price), the old price crossed out next to it,
// and a green "You save ..." line.
export default function PriceTag({ price, originalPrice, formatPrice, isDarkMode, size = 'md' }) {
  const pct = discountPct(price, originalPrice);
  const big = size === 'lg';
  return (
    <div>
      <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-0.5">
        <span className={`${big ? 'text-3xl' : 'text-lg'} font-extrabold leading-none tracking-tight ${pct ? (isDarkMode ? 'text-red-400' : 'text-red-600') : ''}`}>
          {formatPrice(price)}
        </span>
        {pct > 0 && (
          <span className={`${big ? 'text-lg' : 'text-sm'} font-semibold line-through decoration-2 ${isDarkMode ? 'text-gray-500 decoration-gray-500' : 'text-gray-400 decoration-gray-400'}`}>
            {formatPrice(originalPrice)}
          </span>
        )}
      </div>
      {pct > 0 && (
        <p className={`mt-1 ${big ? 'text-sm' : 'text-[11px]'} font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
          You save {formatPrice(originalPrice - price)}
        </p>
      )}
    </div>
  );
}
