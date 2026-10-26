import React from 'react';

// Bold stock line shown on every product card and the product page:
// "In Stock - 12 available" in green, or "Out of Stock" in red.
export default function StockLabel({ count, className = '' }) {
  const n = parseInt(count, 10) || 0;
  return n > 0
    ? <p className={`text-xs sm:text-sm font-bold text-green-600 ${className}`}>&#10003; In Stock &mdash; {n} available</p>
    : <p className={`text-xs sm:text-sm font-bold text-red-600 ${className}`}>Out of Stock</p>;
}
