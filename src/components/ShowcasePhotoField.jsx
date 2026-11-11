import React, { useEffect, useRef, useState } from 'react';
import { getShowcase } from '../showcaseStore';
import { prepareShowcaseImage } from '../utils/showcaseImage';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';

// Admin product form: the background-free "home page photo" of a product (hanging rail / shoe wheel).
// value = the pending change kept in the form until Save / Update: null (no change), { image, hanger }, { off: true }, { remove: true }.
const builtIn = (id) => [...CUTOUTS.men, ...CUTOUTS.shoes].find((c) => c.id === String(id)) || null;

export default function ShowcasePhotoField({ productId, value, onChange, isDarkMode }) {
  const [saved, setSaved] = useState(null); // the Firestore entry of this product
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let live = true;
    setSaved(null); setErr('');
    if (productId) getShowcase(productId).then((d) => { if (live) setSaved(d); }).catch(() => {});
    return () => { live = false; };
  }, [productId]);

  const base = builtIn(productId);
  // what the home page shows after saving
  let shown = null;
  if (value && value.image) shown = { src: value.image, hanger: !!value.hanger, from: 'new' };
  else if (value && (value.remove || value.off)) shown = null;
  else if (saved && saved.image) shown = { src: saved.image, hanger: !!saved.hanger, from: 'uploaded' };
  else if (base && !(saved && saved.off)) shown = { src: cutoutSrc(base.id), hanger: !!base.hanger, from: 'built-in' };

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const image = await prepareShowcaseImage(file);
      onChange({ image, hanger: shown ? shown.hanger : false });
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  // Remove: an uploaded photo is deleted; a built-in one is switched off
  const remove = () => onChange(base ? { off: true } : { remove: true });

  return (
    <div className={`rounded border border-dashed p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
      <p className="text-xs font-semibold text-gray-500">Home page photo (no background)</p>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
        Shown on the home page hanging rail (Men, Women) or the shoe wheel. Upload a PNG / WebP <b>without background</b>:
        on a Mac right-click the photo in Finder → Quick Actions → <b>Remove Background</b>, then upload the new file.
        Best: only the product, front view, no model, no folded shirts.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div className="h-36 w-32 shrink-0 rounded border border-gray-200 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#f1f1f0', backgroundImage: 'linear-gradient(45deg,#e4e4e2 25%,transparent 25%,transparent 75%,#e4e4e2 75%),linear-gradient(45deg,#e4e4e2 25%,transparent 25%,transparent 75%,#e4e4e2 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' }}>
          {shown ? <img src={shown.src} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-gray-400 px-2 text-center">No home page photo</span>}
        </div>
        <div className="flex flex-col gap-2 text-xs">
          {shown && <span className="text-gray-500">{shown.from === 'new' ? 'New photo · saved when you press Save / Update' : shown.from === 'uploaded' ? 'Uploaded photo' : 'Built-in photo'}</span>}
          {value && (value.off || value.remove) && <span className="text-red-500">Will be removed when you press Save / Update</span>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}
              className="border border-[#D4AF37] text-[#D4AF37] font-semibold px-3 py-2 rounded hover:bg-[#D4AF37] hover:text-black transition disabled:opacity-50">
              {busy ? 'Preparing…' : shown ? 'Change photo' : 'Upload photo'}
            </button>
            {shown && (
              <button type="button" onClick={remove} className="border border-red-500 text-red-500 font-semibold px-3 py-2 rounded hover:bg-red-500 hover:text-white transition">Remove</button>
            )}
            {value && <button type="button" onClick={() => onChange(null)} className="px-3 py-2 rounded text-gray-500 hover:underline">Undo</button>}
          </div>
          {shown && shown.from !== 'built-in' && (
            <label className="flex items-center gap-2 text-gray-500">
              <input type="checkbox" checked={!!shown.hanger}
                onChange={(e) => onChange({ image: shown.src, hanger: e.target.checked })} />
              The photo already shows a hanger (do not draw ours)
            </label>
          )}
          {err && <p className="max-w-sm text-red-500">{err}</p>}
          <input ref={fileRef} type="file" accept="image/png,image/webp" className="hidden" onChange={pick} />
        </div>
      </div>
    </div>
  );
}
