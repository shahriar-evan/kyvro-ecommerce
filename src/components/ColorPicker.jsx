import React, { useState } from 'react';

export const COMMON_COLORS = ['White', 'Black', 'Red', 'Blue'];

// Colors of the product: tap the common ones, or type another color and press Add.
// colors = ['White', 'Red'], onToggle(color), onAdd(color)
export default function ColorPicker({ colors, onToggle, onAdd, onRename, isDarkMode }) {
  const [custom, setCustom] = useState('');
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState('');
  const commit = () => { if (editing && onRename) onRename(editing, draft); setEditing(''); };
  const has = (c) => colors.some((x) => x.toLowerCase() === c.toLowerCase());
  const extra = colors.filter((c) => !COMMON_COLORS.some((x) => x.toLowerCase() === c.toLowerCase()));
  const add = () => {
    const c = custom.trim();
    if (!c) return;
    if (!has(c)) onAdd(c);
    setCustom('');
  };
  const base = (c) => `px-3 py-1.5 text-xs border transition ${has(c)
    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold'
    : (isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]')}`;
  const real = (c) => colors.find((x) => x.toLowerCase() === c.toLowerCase()) || c;
  const chip = (c, removable) => {
    if (!removable) {
      return <button key={c} type="button" onClick={() => onToggle(real(c))} className={`${base(c)} rounded`}>{c}</button>;
    }
    if (editing && editing.toLowerCase() === c.toLowerCase()) {
      return (
        <span key={c} className="inline-flex items-center gap-1">
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(''); }}
            className={`w-32 border px-2 py-1.5 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`} />
          <button type="button" onClick={commit} className="text-xs font-bold px-2 py-1.5 rounded bg-[#D4AF37] text-black">Save</button>
          <button type="button" onClick={() => setEditing('')} className="text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-500">Cancel</button>
        </span>
      );
    }
    return (
      <span key={c} className="inline-flex">
        <button type="button" onClick={() => onToggle(real(c))} className={`${base(c)} rounded-l`}>{c}</button>
        {onRename && <button type="button" title="Rename this color" onClick={() => { setEditing(real(c)); setDraft(real(c)); }} className={`px-2 text-xs border-y border-r ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'} bg-[#D4AF37]/30 hover:bg-[#D4AF37]`}>✎</button>}
        <button type="button" title="Remove this color" onClick={() => onToggle(real(c))} className={`px-2 text-xs border-y border-r rounded-r ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'} bg-[#D4AF37]/30 hover:bg-red-500 hover:text-white`}>✕</button>
      </span>
    );
  };
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
          className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg border whitespace-nowrap transition active:scale-[.97] hover:border-[#D4AF37] hover:text-[#D4AF37] ${isDarkMode ? 'border-gray-700 text-gray-300 bg-[#161616]' : 'border-gray-300 text-gray-700 bg-white shadow-sm'}`}
        >
          Add color
        </button>
      </div>
    </div>
  );
}
