import React, { useRef, useState } from 'react';
import { imageFileToDataURL } from '../utils/imageUpload';

// A small row of extra photos: thumbnails with a remove button, an "Add photos" button (several files at once)
// and a box to paste an image link. value = ['url', ...], onChange(newList)
export default function MorePhotos({ value = [], onChange, max = 5, title, hint, isDarkMode, compact = false }) {
  const file = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState('');
  const list = Array.isArray(value) ? value : [];
  const room = max - list.length;

  const addFiles = async (e) => {
    const files = Array.from((e.target.files || [])).slice(0, Math.max(0, room));
    e.target.value = '';
    if (!files.length) return;
    setErr(''); setBusy(true);
    const out = [];
    for (const f of files) {
      try { out.push(await imageFileToDataURL(f, { maxSize: 800, quality: 0.72 })); } catch (x) { setErr(x.message || 'Upload failed.'); }
    }
    if (out.length) onChange([...list, ...out]);
    setBusy(false);
  };
  const addLink = () => {
    const u = link.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) { setErr('The image link must start with http:// or https://'); return; }
    setErr(''); setLink('');
    if (room > 0) onChange([...list, u]);
  };
  const box = isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-[#222]' : 'border-gray-300 text-gray-800 hover:bg-gray-100';
  const inp = `flex-1 min-w-[140px] border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const th = compact ? 'w-12 h-12' : 'w-16 h-16';

  return (
    <div className="space-y-2">
      {title && <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-500`}>{title} <span className="font-normal">({list.length}/{max})</span></p>}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {list.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} alt="" className={`${th} object-cover rounded border border-gray-300`} />
            <button type="button" title="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-5 text-center">×</button>
          </div>
        ))}
        {room > 0 && (
          <>
            <input ref={file} type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
            <button type="button" disabled={busy} onClick={() => file.current && file.current.click()} className={`${th} rounded border border-dashed text-[11px] font-bold disabled:opacity-50 ${box}`}>{busy ? '…' : '+ Add'}</button>
          </>
        )}
      </div>
      {room > 0 && (
        <div className="flex gap-2">
          <input type="text" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} placeholder="or paste an image link, then Enter" className={inp} />
          <button type="button" onClick={addLink} className={`px-3 py-2 text-xs font-bold rounded border whitespace-nowrap ${box}`}>Add link</button>
        </div>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}
