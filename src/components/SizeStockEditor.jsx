import React, { useState } from 'react';
import { sizePresetsFor, orderedSizes } from '../data/catalog';

// Sizes with a separate quantity for each size, e.g. M: 20, XL: 10, L: 15
// value = { M: '20', XL: '10' }  (quantities kept as strings while typing)
export default function SizeStockEditor({ gender, value, onChange, isDarkMode }) {
  const [custom, setCustom] = useState('');
  const presets = sizePresetsFor(gender);
  const sizes = orderedSizes(Object.keys(value || {}), gender);
  const total = sizes.reduce((sum, s) => sum + (parseInt(value[s], 10) || 0), 0);

  const inputClass = `w-24 border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;

  const has = (size) => Object.keys(value || {}).some((k) => k.toLowerCase() === size.toLowerCase());

  const addSize = (raw) => {
    let size = String(raw || '').trim();
    if (!size) return;
    if (/^\d?[a-z]{1,4}$/i.test(size)) size = size.toUpperCase(); // xl -> XL, 4xl -> 4XL
    if (has(size)) return;
    onChange({ ...value, [size]: '' });
  };

  const removeSize = (size) => {
    const next = { ...value };
    delete next[size];
    onChange(next);
  };

  const togglePreset = (size) => (has(size) ? removeSize(Object.keys(value).find((k) => k.toLowerCase() === size.toLowerCase())) : addSize(size));

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Sizes &amp; stock per size</label>
        <p className="text-[11px] text-gray-500">
          Tap a size to add it, then type how many are available (for example M = 20, L = 15, XL = 10).
          Leave this empty if the product has no sizes (bags, watches, wallets, free size).
        </p>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => togglePreset(s)}
              className={`px-3 py-1.5 text-xs rounded border transition ${has(s)
                ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
                : (isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]')}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 max-w-xs">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(custom); setCustom(''); } }}
          placeholder="Other size, e.g. 4XL or 28"
          className={`w-full border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
        />
        <button
          type="button"
          onClick={() => { addSize(custom); setCustom(''); }}
          className={`px-3 text-xs font-bold rounded border whitespace-nowrap ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#222]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
        >
          Add size
        </button>
      </div>

      {sizes.length > 0 && (
        <div className={`rounded border divide-y ${isDarkMode ? 'border-gray-800 divide-gray-800' : 'border-gray-200 divide-gray-200'}`}>
          {sizes.map((s) => (
            <div key={s} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-xs font-bold w-20">{s}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={value[s]}
                  onChange={(e) => onChange({ ...value, [s]: e.target.value })}
                  placeholder="0"
                  className={inputClass}
                />
                <span className="text-[11px] text-gray-500">available</span>
              </div>
              <button type="button" onClick={() => removeSize(s)} className="text-red-400 hover:text-red-300 text-xs px-2" title="Remove this size">✕</button>
            </div>
          ))}
          <div className="px-3 py-2 text-xs font-bold flex justify-between">
            <span>Total stock</span>
            <span className="text-[#D4AF37]">{total} units in {sizes.length} {sizes.length === 1 ? 'size' : 'sizes'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
