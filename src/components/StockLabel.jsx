import React from 'react';

// Bold stock line shown on every product card and the product page.
// In stock: the text the team typed for the product (e.g. "In Stock", "Only 7 left"), otherwise "In Stock"
// (and "Only N left!" in orange once 10 or fewer are left). The real number is never shown by default.
// No stock: "Out of Stock" in red.
export const LOW_STOCK_AT = 10;

export default function StockLabel({ count, text = '', className = '' }) {
  const n = parseInt(count, 10) || 0;
  if (n <= 0) return <p className={`text-xs sm:text-sm font-bold text-red-600 ${className}`}>Out of Stock</p>;
  const custom = String(text || '').trim();
  if (custom) return <p className={`text-xs sm:text-sm font-bold text-green-600 ${className}`}>&#10003; {custom}</p>;
  if (n <= LOW_STOCK_AT) return <p className={`text-xs sm:text-sm font-bold text-orange-500 ${className}`}>&#9889; Only {n} left!</p>;
  return <p className={`text-xs sm:text-sm font-bold text-green-600 ${className}`}>&#10003; In Stock</p>;
}
