import React, { useState } from 'react';

export const COMMON_COLORS = ['White', 'Black', 'Red', 'Blue'];

// Colors of the product: tap the common ones, or type another color and press Add.
// colors = ['White', 'Red'], onToggle(color), onAdd(color)
export default function ColorPicker({ colors, onToggle, onAdd, isDarkMode }) {
  const [custom, setCustom] = useState('');
  const has = (c) => colors.some((x) => x.toLowerCase() === c.toLowerCase());
  const extra = colors.filter((c) => !COMMON_COLORS.some((x) => x.toLowerCase() === c.toLowerCase()));
  const add = () => {
    const c = custom.trim();
    if (!c) return;
    if (!has(c)) onAdd(c);
    setCustom('');
  };
  const chip = (c, removable) => (
    <button
      key={c}
      type="button"
      onClick={() => onToggle(colors.find((x) => x.toLowerCase() === c.toLowerCase()) || c)}
      className={`px-3 py-1.5 text-xs rounded border transition ${has(c)
        ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
        : (isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]')}`}
    >
      {c}{removable ? ' ✕' : ''}
    </button>
  );
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Colors of this product</label>
        <p className="text-[11px] text-gray-500">Tap the colors this product comes in. For any other color, type its name and press Add color.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {COMMON_COLORS.map((c) => chip(c, false))}
        {extra.map((c) => chip(c, true))}
      </div>
      <div className="flex gap-2 max-w-xs">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Other color, e.g. Navy or Olive"
          className={`w-full border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
        />
        <button
          type="button"
          onClick={add}
          className={`px-3 text-xs font-bold rounded border whitespace-nowrap ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#222]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
        >
          Add color
        </button>
      </div>
    </div>
  );
}
