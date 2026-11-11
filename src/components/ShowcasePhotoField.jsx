import React, { useEffect, useRef, useState } from 'react';
import { getShowcase } from '../showcaseStore';
import { prepareShowcaseImage, urlToShowcaseImage, keyBgToShowcase, pickKeyColour } from '../utils/showcaseImage';
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
// sourceNames = { photo url: colour name } (helps pick the AI background colour when a photo cannot be read)
export default function ShowcasePhotoField({ productId, value, onChange, isDarkMode, sources = [], sourceNames = {}, kind = 'garment' }) {
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
  // 📌 pin: shown first on the home rail (1 = first). From the pending change, else from the saved entry.
  const pinNow = value && (value.image || value.pinOnly) ? (Number(value.pin) || 0)
    : value && (value.off || value.remove) ? 0 : (Number(saved && saved.pin) || 0);
  const pinRef = useRef(pinNow);
  pinRef.current = pinNow;
  const setPin = (n) => {
    const pin = Math.max(0, Math.min(99, Math.round(Number(n) || 0)));
    pinRef.current = pin;
    if (value && value.image) onChange({ ...value, pin });
    else onChange({ pinOnly: true, pin });
  };

  // the latest state, also right after a change that the form has not shown yet (two quick clicks must not undo each other)
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const editable = async () => {
    const cur = shownRef.current;
    if (!cur) return null;
    const image = cur.from === 'built-in' ? await urlToShowcaseImage(cur.src) : cur.src;
    return { image, side: cur.side, hanger: cur.hanger, extra: [...cur.extra], pin: pinRef.current };
  };
  const change = (next) => {
    shownRef.current = next && next.image ? { src: next.image, side: next.side || null, hanger: !!next.hanger, extra: next.extra || [], from: 'new' } : null;
    onChange(next);
  };

  // changes run one after another, so two quick clicks (Confirm front, Confirm side) never undo each other
  const queue = useRef(Promise.resolve());
  const run = (fn) => {
    queue.current = queue.current.then(async () => {
      setErr(''); setBusy(true);
      try { await fn(); } catch (ex) { setErr(ex.message || 'Could not use this picture.'); }
      setBusy(false);
    });
    return queue.current;
  };

  const pickMain = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    run(async () => {
      const image = await prepareShowcaseImage(file);
      change({ image, side: shown ? shown.side : null, hanger: shown ? shown.hanger : false, extra: shown ? [...shown.extra] : [] });
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
      change(cur);
    });
  };
  const sideRef = useRef(null);
  const pickSide = (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    run(async () => {
      const cur = await editable();
      if (!cur) throw new Error('Upload the front photo first.');
      change({ ...cur, side: await prepareShowcaseImage(file) });
    });
  };
  const removeSide = () => run(async () => { const cur = await editable(); change({ ...cur, side: null }); });
  const removeExtra = (i) => run(async () => {
    const cur = await editable();
    cur.extra.splice(i, 1);
    change(cur);
  });
  const setHanger = (on) => run(async () => { const cur = await editable(); change({ ...cur, hanger: on }); });
  // Remove: an uploaded photo is deleted; a built-in one is switched off
  const removeAll = () => onChange(base ? { off: true } : { remove: true });

  // ---- Make with AI (api/plan.js?action=ai-photo) ----
  const WAIT = 30; // usual seconds; the counter goes down from here
  const [srcPick, setSrcPick] = useState(0);
  const [aiBusy, setAiBusy] = useState(null); // { view, at } while the AI works
  const [aiRes, setAiRes] = useState({}); // { front, side, clean }: each finished picture stays until used / discarded
  const [aiErr, setAiErr] = useState(null); // { error, code, provider }
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!aiBusy) return undefined;
    setSecs(0);
    const t = setInterval(() => setSecs(Math.floor((Date.now() - aiBusy.at) / 1000)), 250);
    return () => clearInterval(t);
  }, [aiBusy]);
  const source = sources[Math.min(srcPick, Math.max(0, sources.length - 1))];
  // shoes: only "Remove background" (same angle); clothes: make a front or a side view
  const views = kind === 'shoe' ? ['clean'] : ['front', 'side'];
  const VIEW_LABEL = { clean: 'Remove background', front: 'Make front photo', side: 'Make side photo' };
  const makeAi = async (view) => {
    if (!source || aiBusy) return;
    setAiErr(null);
    setAiBusy({ view, at: Date.now() });
    try {
      // ask for a flat background colour the product does not use, then cut that colour out here
      const bg = await pickKeyColour(source, sourceNames[source] || '');
      const raw = await makeAiPhoto({ source, view, kind, bg });
      const cut = await keyBgToShowcase(raw);
      setAiRes((r) => ({ ...r, [view]: cut }));
    } catch (ex) { setAiErr({ error: ex.message || 'Could not make the picture.', code: ex.code || 'failed', provider: ex.provider || 'gemini' }); }
    setAiBusy(null);
  };
  const dropAi = (view) => setAiRes((r) => { const n = { ...r }; delete n[view]; return n; });
  // Confirm: the AI front goes to Front, the AI side to Side (the other slot keeps what it has).
  // A photo that was already in that slot is not lost: it moves to "More photos" (while there is room).
  const useAi = (view) => run(async () => {
    const cut = aiRes[view];
    if (!cut) return;
    const as = view === 'side' ? 'side' : 'front';
    const cur = (await editable()) || { image: null, side: null, hanger: false, extra: [] };
    if (as === 'side' && !cur.image) throw new Error('Confirm the front photo first, then the side.');
    const old = as === 'side' ? cur.side : cur.image;
    const extra = old && old !== cut && !cur.extra.includes(old) && cur.extra.length < MAX_EXTRA ? [...cur.extra, old] : cur.extra;
    // the AI front / side of a garment already shows a wooden hanger
    change(as === 'side'
      ? { ...cur, side: cut, extra }
      : { ...cur, image: cut, extra, hanger: kind === 'garment' && view !== 'clean' ? true : cur.hanger });
    dropAi(view);
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
          {shown ? (
            <div className="flex flex-wrap items-center gap-2 text-gray-600">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={pinNow > 0} onChange={(e) => setPin(e.target.checked ? 1 : 0)} />
                📌 Pin first on the home page
              </label>
              {pinNow > 0 && (
                <label className="flex items-center gap-1">
                  Position
                  <input type="number" min="1" max="99" value={pinNow} onChange={(e) => setPin(Math.max(1, Number(e.target.value) || 1))}
                    className={`w-14 rounded border px-2 py-1 text-xs ${isDarkMode ? 'border-gray-700 bg-[#121212] text-white' : 'border-gray-300 bg-white text-black'}`} />
                  <span className="text-gray-400">(1 = first)</span>
                </label>
              )}
            </div>
          ) : (
            <span className="text-gray-400">📌 Add a home page photo first, then you can pin it to the front.</span>
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
          <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{kind === 'shoe' ? '✨ Remove background with AI' : '✨ Make with AI'}</p>
          <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
            {kind === 'shoe'
              ? 'Pick one of this shoe\'s photos (the red one is picked): the AI keeps the shoe as it is and only removes the background. '
              : 'Pick one of this product\'s photos (the red one is picked), then make the front and / or the side view (both stay here until you use them). '}
            It takes about {WAIT} seconds and uses your AI credit.
            <b> Check that colours, logos and text match the real product</b> before you use it (AI sometimes invents letters).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.slice(0, 10).map((u, i) => (
              <button key={u.slice(0, 80) + i} type="button" disabled={!!aiBusy} onClick={() => setSrcPick(i)} aria-label={`Use photo ${i + 1}`}
                className={`relative h-16 w-16 overflow-hidden rounded bg-white transition ${i === srcPick ? 'border-[3px] border-red-600 ring-2 ring-red-600/30 scale-105' : 'border-2 border-transparent opacity-80 hover:opacity-100'}`}>
                <img src={u} alt="" className="h-full w-full object-cover" />
                {i === srcPick && <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">✓</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {views.map((v) => (
              <button key={v} type="button" disabled={!!aiBusy || busy} onClick={() => makeAi(v)}
                className="rounded bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                {aiBusy && aiBusy.view === v ? `Making… ${Math.max(0, WAIT - secs)}s` : VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          {aiBusy && (
            <div className="mt-3 max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-red-600 transition-[width] duration-300" style={{ width: `${Math.min(97, (secs / WAIT) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {secs < WAIT ? `About ${WAIT - secs}s left · the photo shows here when it is ready.` : 'Almost done… (taking a little longer than usual, please wait)'}
              </p>
            </div>
          )}
          {views.filter((v) => aiRes[v]).map((v) => (
            <div key={v} className="mt-3 flex flex-wrap items-start gap-3">
              <div className="text-center">
                <Thumb src={aiRes[v]} big />
                <p className="mt-1 text-[10px] font-semibold uppercase text-gray-500">{v === 'clean' ? 'AI photo' : `AI ${v}`}</p>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <span className="text-gray-500">{v === 'clean' ? 'Background removed by AI.' : `AI ${v} photo, background removed.`} Does it match the real product? Confirm puts it in the {v === 'side' ? 'SIDE' : 'FRONT'} box above (the photo that was there moves to More photos).</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => useAi(v)}
                    title={v === 'side' ? 'Puts this picture in the SIDE slot' : 'Puts this picture in the FRONT slot'}
                    className="rounded bg-[#D4AF37] px-4 py-2 font-bold text-black hover:opacity-90 disabled:opacity-50">✓ Confirm{v === 'clean' ? '' : ` ${v}`}</button>
                  <button type="button" disabled={!!aiBusy} onClick={() => makeAi(v)} className="rounded border border-gray-300 px-3 py-2 disabled:opacity-50">Try again</button>
                  <button type="button" onClick={() => dropAi(v)} className="px-3 py-2 text-gray-500 hover:underline">Discard</button>
                </div>
              </div>
            </div>
          ))}
          {aiErr && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
              <p className="font-semibold">{aiErr.error}</p>
              {aiErr.code === 'no-credit' && (aiErr.provider === 'openrouter' ? (
                <p className="mt-1">Buy more credit, then try again: <A href={LINKS.orCredits}>OpenRouter → Credits (buy) →</A> · if the key has a limit, raise it in <A href={LINKS.orKeys}>OpenRouter → Keys</A>.</p>
              ) : (
                <p className="mt-1">Add credit or turn billing on, then try again: <A href={LINKS.billing}>Google Cloud billing →</A> · <A href={LINKS.usage}>AI Studio usage →</A></p>
              ))}
              {aiErr.code === 'no-key' && (
                <p className="mt-1">Make a key at <A href={LINKS.orKeys}>OpenRouter → Keys</A> (buy credit at <A href={LINKS.orCredits}>Credits</A>), then add it as <b>OPENROUTER_API_KEY</b> in <A href={LINKS.vercel}>Vercel → Environment Variables</A> (Production) and redeploy.</p>
              )}
              {aiErr.code === 'bad-key' && (aiErr.provider === 'openrouter' ? (
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
