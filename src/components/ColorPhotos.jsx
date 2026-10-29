import React, { useRef, useState } from 'react';
import { imageFileToDataURL } from '../utils/imageUpload';
import MorePhotos from './MorePhotos';

// One photo per color: the customer sees the photo of the color he picks.
// colors = ['Red','Blue'], value = { Red: url }, onChange(newValue)
export default function ColorPhotos({ colors, value = {}, onChange, gallery = {}, onGalleryChange, isDarkMode }) {
  if (!colors.length) return null;
  const set = (color, url) => {
    const next = { ...value };
    if (url) next[color] = url; else delete next[color];
    onChange(next);
  };
  return (
    <div className={`rounded border p-3 space-y-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
      <div>
        <p className="text-xs font-bold">Photo for each color (optional)</p>
        <p className="text-[11px] text-gray-500">Upload a photo of the product in that color. When a customer picks the color, this photo shows. Colors without a photo use the main image. You can add 2-3 more photos of the same color with "+ Add" under it.</p>
      </div>
      {colors.map((c) => (
        <div key={c} className="space-y-2">
          <Row color={c} url={value[c] || ''} set={set} isDarkMode={isDarkMode} />
          {onGalleryChange && (
            <div className="pl-[68px]">
              <MorePhotos compact max={3} title={`More ${c} photos`} value={gallery[c] || []} isDarkMode={isDarkMode}
                onChange={(list) => { const next = { ...gallery }; if (list.length) next[c] = list; else delete next[c]; onGalleryChange(next); }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ color, url, set, isDarkMode }) {
  const file = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const uploaded = url.startsWith('data:');
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setBusy(true);
    try { set(color, await imageFileToDataURL(f, { maxSize: 700, quality: 0.75 })); } catch (x) { setErr(x.message || 'Upload failed.'); }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {url ? <img src={url} alt={color} className="w-14 h-14 object-cover rounded border border-gray-300" /> : <div className="w-14 h-14 rounded border border-dashed border-gray-400 flex items-center justify-center text-[10px] text-gray-500">No photo</div>}
      <span className="text-xs font-semibold w-24">{color}</span>
      <input type="text" value={uploaded ? '' : url} onChange={(e) => set(color, e.target.value.trim())} placeholder={uploaded ? 'Photo uploaded' : 'Image link (optional)'}
        className={`flex-1 min-w-[140px] border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`} />
      <input ref={file} type="file" accept="image/*" onChange={pick} className="hidden" />
      <button type="button" disabled={busy} onClick={() => file.current && file.current.click()} className={`px-3 py-2 text-xs font-bold rounded border whitespace-nowrap disabled:opacity-50 ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-[#222]' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}>{busy ? 'Processing...' : 'Upload photo'}</button>
      {url && <button type="button" onClick={() => set(color, '')} className="text-red-400 hover:text-red-300 text-xs underline">Remove</button>}
      {err && <p className="w-full text-xs text-red-500">{err}</p>}
    </div>
  );
}
