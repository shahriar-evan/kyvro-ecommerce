import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, Lock, Check, RotateCw } from 'lucide-react';
import { THEMES, THEME_MODES, cleanTheme, cleanMode } from '../data/themes';
import { GOLD_BTN } from './ui';

// A small drawing of each theme's home page for its card (no screenshots, so it never goes out of date)
function Thumb({ theme, dark }) {
  const bg = dark ? 'bg-[#141414]' : theme === 'boutique' ? 'bg-[#FBF7F0]' : 'bg-white';
  const ink = dark ? 'bg-gray-500' : 'bg-gray-800';
  const soft = dark ? 'bg-gray-700' : 'bg-gray-200';
  const photo = 'bg-gradient-to-br from-[#c9a35a] via-[#8a6d3b] to-[#3b2f1d]';
  return (
    <div className={`h-28 rounded-lg overflow-hidden border ${dark ? 'border-gray-800' : 'border-gray-200'} ${bg} p-1.5 flex flex-col gap-1`}>
      <div className="flex items-center justify-between"><span className={`h-1.5 w-6 rounded ${ink}`} /><span className="flex gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 w-2.5 rounded ${soft}`} />)}</span></div>
      {theme === 'classic' && (<>
        <div className={`h-10 rounded ${photo} relative`}><span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-8 rounded-full bg-[#D4AF37]" /></div>
        <div className="grid grid-cols-6 gap-0.5">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-4 rounded-sm ${photo} opacity-80`} />)}</div>
        <div className="grid grid-cols-4 gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-5 rounded-sm border ${dark ? 'border-gray-700' : 'border-gray-300'}`} />)}</div>
      </>)}
      {theme === 'minimal' && (<>
        <div className="flex flex-col items-center gap-0.5 py-1.5"><span className={`h-2 w-14 ${ink}`} /><span className={`h-1 w-10 ${soft}`} /><span className={`mt-0.5 h-1.5 w-6 ${ink}`} /></div>
        <div className="flex gap-0.5 justify-center">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-5 border ${dark ? 'border-gray-600' : 'border-gray-300'}`} />)}</div>
        <div className="grid grid-cols-4 gap-1 mt-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`aspect-square ${soft}`} />)}</div>
      </>)}
      {theme === 'bold' && (<>
        <div className={`h-12 rounded ${photo} relative`}><span className="absolute left-1.5 top-2 h-2 w-12 bg-white" /><span className="absolute left-1.5 top-5 h-2 w-9 bg-white" /><span className="absolute left-1.5 bottom-1.5 h-2 w-7 rounded-full bg-[#D4AF37]" /></div>
        <div className="grid grid-cols-3 gap-0.5">{[0, 1, 2].map((i) => <span key={i} className={`h-6 rounded-md ${photo}`} />)}</div>
        <span className="h-2 rounded bg-black" />
      </>)}
      {theme === 'boutique' && (<>
        <div className="flex flex-col items-center gap-0.5"><span className={`h-1.5 w-12 rounded ${ink}`} /><span className="h-px w-4 bg-[#D4AF37]" /></div>
        <div className={`h-8 rounded-xl ${photo}`} />
        <div className="flex justify-center gap-1">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-4 w-4 rounded-full ${photo} ring-1 ring-[#D4AF37]/60`} />)}</div>
        <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-5 rounded-lg ${photo} opacity-80`} />)}</div>
      </>)}
    </div>
  );
}

// Theme picker for the main site (Owner) or one shop (its seller / team owner).
// allowAll: false = only Classic can be applied (the others can still be previewed, with an upgrade button).
export default function ThemePicker({ current, allowAll, previewPath, onSave, onUpgrade, isDarkMode, title = 'Themes', note }) {
  const [theme, setTheme] = useState(cleanTheme(current && current.theme));
  const [mode, setMode] = useState(cleanMode(current && current.mode));
  const [device, setDevice] = useState('desktop');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [frameKey, setFrameKey] = useState(0);
  // follow the saved value when it changes (another device, or after saving)
  useEffect(() => { setTheme(cleanTheme(current && current.theme)); setMode(cleanMode(current && current.mode)); }, [current && current.theme, current && current.mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = (key) => !allowAll && !(THEMES.find((t) => t.key === key) || {}).free;
  const dirty = theme !== cleanTheme(current && current.theme) || mode !== cleanMode(current && current.mode);
  const src = `${previewPath}${previewPath.includes('?') ? '&' : '?'}themePreview=${theme}&themeMode=${mode}`;
  const card = `rounded-2xl border p-5 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const apply = async () => {
    setMsg(null);
    if (locked(theme)) { if (onUpgrade) onUpgrade(); return; }
    setBusy(true);
    try { await onSave(theme, mode); setMsg({ type: 'ok', text: 'Saved. Your website shows this theme now.' }); }
    catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save: this theme is not on your plan (or publish the latest Firestore rules).' : e.message }); }
    setBusy(false);
  };
  const seg = (on) => `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition ${on ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : isDarkMode ? 'border-gray-700 text-gray-300 hover:border-[#D4AF37]/60' : 'border-gray-300 text-gray-700 hover:border-[#D4AF37]/60'}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        <p className="text-xs text-gray-500 mt-1">{note || 'Pick a design for your website, see it in the preview below, then press Apply theme.'}</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {THEMES.map((t) => {
          const on = theme === t.key;
          const live = cleanTheme(current && current.theme) === t.key;
          return (
            <button key={t.key} type="button" aria-pressed={on} onClick={() => { setTheme(t.key); setMsg(null); }}
              className={`relative text-left rounded-2xl border p-3 transition ${on ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40' : isDarkMode ? 'border-gray-800 hover:border-[#D4AF37]/50' : 'border-gray-200 hover:border-[#D4AF37]/60'} ${isDarkMode ? 'bg-[#161616]' : 'bg-white'}`}>
              <Thumb theme={t.key} dark={mode === 'dark'} />
              <span className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold">{t.label}</span>
                {live && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-600/15 text-green-600">Live</span>}
                {locked(t.key) && <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#B8921F]"><Lock size={9} />Pro</span>}
              </span>
              <span className="block mt-0.5 text-[11px] text-gray-500 line-clamp-2">{t.desc}</span>
              {on && <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-black"><Check size={14} /></span>}
            </button>
          );
        })}
      </div>
      <div className={`${card} flex flex-col lg:flex-row lg:items-center gap-4 justify-between`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B8921F]">Light / dark</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Theme mode">
            {THEME_MODES.map((m) => <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => { setMode(m.key); setMsg(null); }} className={seg(mode === m.key)}>{m.label}</button>)}
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-1">
          <button type="button" disabled={busy || (!dirty && !locked(theme))} onClick={apply} className={GOLD_BTN}>{busy ? 'Saving...' : locked(theme) ? 'Upgrade to Pro for this theme' : dirty ? 'Apply theme' : 'Applied'}</button>
          {msg && <span className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
        </div>
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-bold">Preview your website <span className="font-normal text-gray-500">· not saved until you apply</span></p>
          <div className="flex gap-2" role="group" aria-label="Preview size">
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} className={seg(device === 'desktop')} title="Computer"><Monitor size={14} /> Computer</button>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} className={seg(device === 'mobile')} title="Mobile"><Smartphone size={14} /> Mobile</button>
            <button type="button" onClick={() => setFrameKey((k) => k + 1)} className={seg(false)} title="Reload preview" aria-label="Reload preview"><RotateCw size={14} /></button>
          </div>
        </div>
        <div className={`rounded-xl overflow-hidden flex justify-center ${isDarkMode ? 'bg-black/40' : 'bg-gray-100'} p-2 sm:p-3`}>
          <iframe key={`${src}-${frameKey}`} title="Theme preview" src={src}
            className={`bg-white border-0 rounded-lg shadow-lg transition-all ${device === 'mobile' ? 'w-[375px] max-w-full h-[680px]' : 'w-full h-[640px]'}`} />
        </div>
      </div>
    </div>
  );
}
