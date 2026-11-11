import React, { useEffect, useRef, useState } from 'react';
import { getShowcase } from '../showcaseStore';
import { prepareShowcaseImage, urlToShowcaseImage } from '../utils/showcaseImage';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';

// Admin product form: the background-free "home page photo" of a product (hanging rail / shoe wheel)
// plus up to 3 more angles (back, side) for the quick view.
// value = the pending change kept in the form until Save / Update:
//   null (no change), { image, hanger, extra: [] }, { off: true } (hide built-in), { remove: true } (delete uploaded).
// A transparent PNG / WebP uploaded as the main or a colour photo is added here by itself (see addAutoShowcase).
export const MAX_EXTRA = 3;
const builtIn = (id) => [...CUTOUTS.men, ...CUTOUTS.shoes].find((c) => c.id === String(id)) || null;

// a transparent main / colour / more photo was uploaded: first one = home page photo, then the extra angles
export const addAutoShowcase = (value, url) => {
  if (value && value.image) {
    const extra = value.extra || [];
    if (value.image === url || extra.includes(url) || extra.length >= MAX_EXTRA) return value;
    return { ...value, extra: [...extra, url] };
  }
  return { image: url, hanger: false, extra: [], auto: true };
};

const Thumb = ({ src, onRemove, big }) => (
  <div className={`relative ${big ? 'h-36 w-32' : 'h-20 w-16'} shrink-0 rounded border border-gray-200 flex items-center justify-center overflow-hidden`}
    style={{ backgroundColor: '#f1f1f0', backgroundImage: 'linear-gradient(45deg,#e4e4e2 25%,transparent 25%,transparent 75%,#e4e4e2 75%),linear-gradient(45deg,#e4e4e2 25%,transparent 25%,transparent 75%,#e4e4e2 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' }}>
    {src ? <img src={src} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-gray-400 px-2 text-center">No home page photo</span>}
    {onRemove && (
      <button type="button" onClick={onRemove} aria-label="Remove this photo"
        className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white/90 text-red-500 text-xs font-bold shadow">×</button>
    )}
  </div>
);

export default function ShowcasePhotoField({ productId, value, onChange, isDarkMode }) {
  const [saved, setSaved] = useState(null); // the Firestore entry of this product
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const mainRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    let live = true;
    setSaved(null); setErr('');
    if (productId) getShowcase(productId).then((d) => { if (live) setSaved(d); }).catch(() => {});
    return () => { live = false; };
  }, [productId]);

  const base = builtIn(productId);
  // what the home page shows after saving
  let shown = null;
  if (value && value.image) shown = { src: value.image, hanger: !!value.hanger, extra: value.extra || [], from: value.auto ? 'auto' : 'new' };
  else if (value && (value.remove || value.off)) shown = null;
  else if (saved && saved.image) shown = { src: saved.image, hanger: !!saved.hanger, extra: saved.extra || [], from: 'uploaded' };
  else if (base && !(saved && saved.off)) shown = { src: cutoutSrc(base.id), hanger: !!base.hanger, extra: [], from: 'built-in' };

  // the current state as an editable value (a built-in picture is turned into a data URL first)
  const editable = async () => {
    if (!shown) return null;
    const image = shown.from === 'built-in' ? await urlToShowcaseImage(shown.src) : shown.src;
    return { image, hanger: shown.hanger, extra: [...shown.extra] };
  };

  const run = async (fn) => { setErr(''); setBusy(true); try { await fn(); } catch (ex) { setErr(ex.message || 'Could not use this picture.'); } setBusy(false); };

  const pickMain = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    run(async () => {
      const image = await prepareShowcaseImage(file);
      onChange({ image, hanger: shown ? shown.hanger : false, extra: shown ? [...shown.extra] : [] });
    });
  };
  const pickMore = (e) => {
    const files = Array.from(e.target.files || []); e.target.value = '';
    if (!files.length) return;
    run(async () => {
      const cur = await editable();
      if (!cur) throw new Error('Upload the home page photo first.');
      for (const f of files) {
        if (cur.extra.length >= MAX_EXTRA) break;
        cur.extra.push(await prepareShowcaseImage(f));
      }
      onChange(cur);
    });
  };
  const removeExtra = (i) => run(async () => {
    const cur = await editable();
    cur.extra.splice(i, 1);
    onChange(cur);
  });
  const setHanger = (on) => run(async () => { const cur = await editable(); onChange({ ...cur, hanger: on }); });
  // Remove: an uploaded photo is deleted; a built-in one is switched off
  const removeAll = () => onChange(base ? { off: true } : { remove: true });

  const label = shown && { auto: 'Taken from the transparent photo you uploaded above · saved when you press Save / Update',
    new: 'New photo · saved when you press Save / Update', uploaded: 'Uploaded photo', 'built-in': 'Built-in photo' }[shown.from];

  return (
    <div className={`rounded border border-dashed p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
      <p className="text-xs font-semibold text-gray-500">Home page photo (no background)</p>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
        Shown on the home page hanging rail (Men, Women) or the shoe wheel; <b>More</b> photos (back, side) show in the quick view.
        Upload a PNG / WebP <b>without background</b>: on a Mac right-click the photo in Finder → Quick Actions → <b>Remove Background</b>.
        A transparent PNG used as the main or a colour photo above is added here by itself. Best: only the product, front view, no model, no folded shirts.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <Thumb src={shown && shown.src} big />
        <div className="flex flex-col gap-2 text-xs">
          {label && <span className="text-gray-500 max-w-sm">{label}</span>}
          {value && (value.off || value.remove) && <span className="text-red-500">Will be removed when you press Save / Update</span>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => mainRef.current && mainRef.current.click()}
              className="border border-[#D4AF37] text-[#D4AF37] font-semibold px-3 py-2 rounded hover:bg-[#D4AF37] hover:text-black transition disabled:opacity-50">
              {busy ? 'Preparing…' : shown ? 'Change photo' : 'Upload photo'}
            </button>
            {shown && (
              <button type="button" onClick={removeAll} className="border border-red-500 text-red-500 font-semibold px-3 py-2 rounded hover:bg-red-500 hover:text-white transition">Remove</button>
            )}
            {value && <button type="button" onClick={() => onChange(null)} className="px-3 py-2 rounded text-gray-500 hover:underline">Undo</button>}
          </div>
          {shown && (
            <label className="flex items-center gap-2 text-gray-500">
              <input type="checkbox" checked={!!shown.hanger} disabled={busy} onChange={(e) => setHanger(e.target.checked)} />
              The photo already shows a hanger (do not draw ours)
            </label>
          )}
          {err && <p className="max-w-sm text-red-500">{err}</p>}
        </div>
      </div>

      {shown && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-gray-500">More photos for the quick view ({shown.extra.length}/{MAX_EXTRA})</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {shown.extra.map((src, i) => <Thumb key={i} src={src} onRemove={() => removeExtra(i)} />)}
            {shown.extra.length < MAX_EXTRA && (
              <button type="button" disabled={busy} onClick={() => moreRef.current && moreRef.current.click()}
                className="h-20 w-16 rounded border border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50">+ More</button>
            )}
          </div>
        </div>
      )}
      <input ref={mainRef} type="file" accept="image/png,image/webp" className="hidden" onChange={pickMain} />
      <input ref={moreRef} type="file" accept="image/png,image/webp" multiple className="hidden" onChange={pickMore} />
    </div>
  );
}
