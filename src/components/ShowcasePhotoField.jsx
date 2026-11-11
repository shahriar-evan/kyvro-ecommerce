import React, { useEffect, useRef, useState } from 'react';
import { getShowcase } from '../showcaseStore';
import { prepareShowcaseImage, urlToShowcaseImage, whiteBgToShowcase } from '../utils/showcaseImage';
import { makeAiPhoto } from '../aiPhoto';
import { CUTOUTS, cutoutSrc } from '../data/cutouts';

// Admin product form: the background-free "home page photo" of a product (hanging rail / shoe wheel)
// plus up to 3 more angles (back, side) for the quick view.
// value = the pending change kept in the form until Save / Update:
//   null (no change), { image (front), side, hanger, extra: [] }, { off: true } (hide built-in), { remove: true } (delete uploaded).
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

const LINKS = {
  key: 'https://aistudio.google.com/apikey',
  billing: 'https://console.cloud.google.com/billing',
  usage: 'https://aistudio.google.com/usage',
  vercel: 'https://vercel.com/shahriar-evans-projects/kyvro-ecommerce/settings/environment-variables',
  orCredits: 'https://openrouter.ai/settings/credits',
  orKeys: 'https://openrouter.ai/settings/keys',
};
const A = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#B8921F] underline">{children}</a>;

// sources = the product's photos in the form (main, colour, more); kind = 'garment' | 'shoe'
export default function ShowcasePhotoField({ productId, value, onChange, isDarkMode, sources = [], kind = 'garment' }) {
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
  if (value && value.image) shown = { src: value.image, side: value.side || null, hanger: !!value.hanger, extra: value.extra || [], from: value.auto ? 'auto' : 'new' };
  else if (value && (value.remove || value.off)) shown = null;
  else if (saved && saved.image) shown = { src: saved.image, side: saved.side || null, hanger: !!saved.hanger, extra: saved.extra || [], from: 'uploaded' };
  else if (base && !(saved && saved.off)) shown = { src: cutoutSrc(base.id), side: null, hanger: !!base.hanger, extra: [], from: 'built-in' };

  // the current state as an editable value (a built-in picture is turned into a data URL first)
  const editable = async () => {
    if (!shown) return null;
    const image = shown.from === 'built-in' ? await urlToShowcaseImage(shown.src) : shown.src;
    return { image, side: shown.side, hanger: shown.hanger, extra: [...shown.extra] };
  };

  const run = async (fn) => { setErr(''); setBusy(true); try { await fn(); } catch (ex) { setErr(ex.message || 'Could not use this picture.'); } setBusy(false); };

  const pickMain = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    run(async () => {
      const image = await prepareShowcaseImage(file);
      onChange({ image, side: shown ? shown.side : null, hanger: shown ? shown.hanger : false, extra: shown ? [...shown.extra] : [] });
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
  const sideRef = useRef(null);
  const pickSide = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    run(async () => {
      const cur = await editable();
      if (!cur) throw new Error('Upload the front photo first.');
      onChange({ ...cur, side: await prepareShowcaseImage(file) });
    });
  };
  const removeSide = () => run(async () => { const cur = await editable(); onChange({ ...cur, side: null }); });
  const removeExtra = (i) => run(async () => {
    const cur = await editable();
    cur.extra.splice(i, 1);
    onChange(cur);
  });
  const setHanger = (on) => run(async () => { const cur = await editable(); onChange({ ...cur, hanger: on }); });
  // Remove: an uploaded photo is deleted; a built-in one is switched off
  const removeAll = () => onChange(base ? { off: true } : { remove: true });

  // ---- Make with AI (Gemini, api/plan.js?action=ai-photo) ----
  const [srcPick, setSrcPick] = useState(0);
  const [ai, setAi] = useState(null); // { view, cut } | { busy: view } | { error, code }
  const source = sources[Math.min(srcPick, Math.max(0, sources.length - 1))];
  const makeAi = async (view) => {
    if (!source) return;
    setAi({ busy: view });
    try {
      const raw = await makeAiPhoto({ source, view, kind });
      setAi({ view, cut: await whiteBgToShowcase(raw) });
    } catch (ex) { setAi({ error: ex.message || 'Could not make the picture.', code: ex.code || 'failed', provider: ex.provider || 'gemini' }); }
  };
  const useAi = (as) => run(async () => {
    const cur = (await editable()) || { image: null, side: null, hanger: false, extra: [] };
    if (as === 'side' && !cur.image) throw new Error('Make or upload the front photo first.');
    // the AI front of a garment already shows a wooden hanger
    onChange(as === 'side' ? { ...cur, side: ai.cut } : { ...cur, image: ai.cut, hanger: kind === 'garment' ? true : cur.hanger });
    setAi(null);
  });

  const label = shown && { auto: 'Taken from the transparent photo you uploaded above · saved when you press Save / Update',
    new: 'New photo · saved when you press Save / Update', uploaded: 'Uploaded photo', 'built-in': 'Built-in photo' }[shown.from];

  return (
    <div className={`rounded border border-dashed p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
      <p className="text-xs font-semibold text-gray-500">Home page photo (no background)</p>
      <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
        Shown on the home page hanging rail (Men, Women) or the shoe wheel; <b>More</b> photos (back, side) show in the quick view.
        With a <b>Side photo</b> (the product hanging, seen from the side) the rail shows it from the side and turns it to the front on hover / tap.
        Upload a PNG / WebP <b>without background</b>: on a Mac right-click the photo in Finder → Quick Actions → <b>Remove Background</b>.
        A transparent PNG used as the main or a colour photo above is added here by itself. Best: only the product, front view, no model, no folded shirts.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div className="text-center">
          <Thumb src={shown && shown.src} big />
          <p className="mt-1 text-[10px] font-semibold text-gray-500">FRONT</p>
        </div>
        {shown && (
          <div className="text-center">
            {shown.side ? <Thumb src={shown.side} big onRemove={removeSide} /> : (
              <button type="button" disabled={busy} onClick={() => sideRef.current && sideRef.current.click()}
                className="h-36 w-32 rounded border border-dashed border-gray-300 text-[11px] font-semibold text-gray-500 px-2 hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50">
                + Side photo<br /><span className="font-normal">(optional)</span>
              </button>
            )}
            <p className="mt-1 text-[10px] font-semibold text-gray-500">SIDE</p>
          </div>
        )}
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
      {sources.length > 0 && (
        <div className={`mt-4 rounded border p-3 ${isDarkMode ? 'border-gray-700 bg-[#151515]' : 'border-amber-200 bg-amber-50/60'}`}>
          <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>✨ Make with AI (Gemini)</p>
          <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
            Pick one of this product's photos, then make the front or the side view. It takes about 10-30 seconds and uses your AI credit (OpenRouter or Gemini).
            <b> Check that colours, logos and text match the real product</b> before you use it (AI sometimes invents letters).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.slice(0, 10).map((u, i) => (
              <button key={u.slice(0, 80) + i} type="button" onClick={() => setSrcPick(i)} aria-label={`Use photo ${i + 1}`}
                className={`h-14 w-14 overflow-hidden rounded border-2 bg-white ${i === srcPick ? 'border-[#D4AF37]' : 'border-transparent'}`}>
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {['front', 'side'].map((v) => (
              <button key={v} type="button" disabled={!!(ai && ai.busy) || busy} onClick={() => makeAi(v)}
                className="rounded bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                {ai && ai.busy === v ? 'Making… (10-30 s)' : `Make ${v} photo`}
              </button>
            ))}
          </div>
          {ai && ai.cut && (
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <Thumb src={ai.cut} big />
              <div className="flex flex-col gap-2 text-xs">
                <span className="text-gray-500">AI {ai.view} photo, background removed. Does it match the real product?</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => useAi(ai.view)}
                    className="rounded bg-[#D4AF37] px-3 py-2 font-bold text-black hover:opacity-90 disabled:opacity-50">Use as {ai.view}</button>
                  <button type="button" disabled={busy} onClick={() => useAi(ai.view === 'side' ? 'front' : 'side')}
                    className="rounded border border-[#D4AF37] px-3 py-2 font-semibold text-[#B8921F]">Use as {ai.view === 'side' ? 'front' : 'side'} instead</button>
                  <button type="button" onClick={() => makeAi(ai.view)} className="rounded border border-gray-300 px-3 py-2">Try again</button>
                  <button type="button" onClick={() => setAi(null)} className="px-3 py-2 text-gray-500 hover:underline">Discard</button>
                </div>
              </div>
            </div>
          )}
          {ai && ai.error && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
              <p className="font-semibold">{ai.error}</p>
              {ai.code === 'no-credit' && (ai.provider === 'openrouter' ? (
                <p className="mt-1">Buy more credit, then try again: <A href={LINKS.orCredits}>OpenRouter → Credits (buy) →</A> · if the key has a limit, raise it in <A href={LINKS.orKeys}>OpenRouter → Keys</A>.</p>
              ) : (
                <p className="mt-1">Add credit or turn billing on, then try again: <A href={LINKS.billing}>Google Cloud billing →</A> · <A href={LINKS.usage}>AI Studio usage →</A></p>
              ))}
              {ai.code === 'no-key' && (
                <p className="mt-1">Make a key at <A href={LINKS.orKeys}>OpenRouter → Keys</A> (buy credit at <A href={LINKS.orCredits}>Credits</A>), then add it as <b>OPENROUTER_API_KEY</b> in <A href={LINKS.vercel}>Vercel → Environment Variables</A> (Production) and redeploy.</p>
              )}
              {ai.code === 'bad-key' && (ai.provider === 'openrouter' ? (
                <p className="mt-1">Make a new key at <A href={LINKS.orKeys}>OpenRouter → Keys</A> and replace <b>OPENROUTER_API_KEY</b> in <A href={LINKS.vercel}>Vercel</A>.</p>
              ) : (
                <p className="mt-1">Make a new key at <A href={LINKS.key}>Google AI Studio → API keys</A> and replace <b>GEMINI_API_KEY</b> in <A href={LINKS.vercel}>Vercel</A>.</p>
              ))}
            </div>
          )}
        </div>
      )}
      <input ref={mainRef} type="file" accept="image/png,image/webp" className="hidden" onChange={pickMain} />
      <input ref={moreRef} type="file" accept="image/png,image/webp" multiple className="hidden" onChange={pickMore} />
      <input ref={sideRef} type="file" accept="image/png,image/webp" className="hidden" onChange={pickSide} />
    </div>
  );
}
