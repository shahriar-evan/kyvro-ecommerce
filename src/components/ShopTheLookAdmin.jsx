import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Upload, Trash2, Pencil, Plus, X } from 'lucide-react';
import { askConfirm } from './AlertCenter';
import { watchLooks, saveLook, deleteLook, LOOK_MAX_ITEMS, LOOK_MAX } from '../looks';
import { makeAiLook } from '../aiPhoto';
import { prepareLookImage, lookFramed, reframeLook } from '../utils/showcaseImage';
import { totalStock, rankBySales } from '../data/catalog';

// Admin → Shop the Look (Owner / Manager). A look = a full-body model picture (transparent) + the 1-4 store products
// worn in it, each with a numbered pin on the picture. ✨ Make with AI (OpenAI) dresses a model in the picked products;
// or upload your own transparent PNG. Shown on the home page between the Men's and Women's rails (ShopTheLook.jsx).
const EMPTY = { id: '', name: '', who: 'men', image: '', items: [], order: 0, active: true };
// Auto make: what a product is in an outfit, and where its pin goes
const MEN_SIDE = (p) => ['Men', 'Winter', 'Jackets', 'Shoes'].includes(p.gender);
export const pieceKind = (p) => {
  const t = `${p.category || ''} ${p.name || ''}`;
  if (p.gender === 'Shoes' || /shoe|sneaker|loafer|sandal|boot|slipper/i.test(p.category || '')) return 'shoes';
  if (/sweat ?pant|pant|jogger|trouser|jeans|cargo|shorts/i.test(t) && !/sweatshirt/i.test(t)) return 'bottom';
  if (/shirt|tee|polo|jacket|hoodie|sweat|blazer|sweater|coat|punjabi|katua|padding|puffer/i.test(t)) return 'top';
  return null;
};
const PIN = { top: { x: 50, y: 33 }, bottom: { x: 50, y: 68 }, shoes: { x: 50, y: 95 } };
const AUTO = [
  { name: 'Winter Street', top: /jacket|padding|puffer|coat/i },
  { name: 'Smart Casual', top: /^(?!.*(t-shirt|tee|sweat)).*shirt/i },
  { name: 'Weekend Tee', top: /t-shirt|\btee\b|polo/i },
  { name: 'Easy Layers', top: /hoodie|sweatshirt|sweater/i },
];
const QUALITY = { medium: { label: 'Standard', note: '~$0.06 · 30-60 s', secs: 50 }, high: { label: 'Premium', note: '~$0.25 · 1-3 min, sharper face & fabric', secs: 120 } };
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const absUrl = (u) => (/^https?:\/\//.test(u) || /^data:/.test(u) ? u : `${window.location.origin}${u.startsWith('/') ? '' : '/'}${u}`);

export default function ShopTheLookAdmin({ products = [], isDarkMode, formatPrice, staff }) {
  const [looks, setLooks] = useState(null);
  useEffect(() => watchLooks(setLooks), []);
  const [form, setForm] = useState(null); // the look being made / changed
  const [q, setQ] = useState('');
  const [pinFor, setPinFor] = useState(0); // which item the next click on the picture places
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products]);
  const [quality, setQuality] = useState('medium');
  // timer while OpenAI works
  const [startedAt, setStartedAt] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => { if (!startedAt) return undefined; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [startedAt]);
  const secs = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  // which looks already use a product (a product can be in several looks: same shoes, other clothes)
  const usedIn = useMemo(() => {
    const m = {};
    (looks || []).forEach((l) => l.items.forEach((it) => { (m[it.id] = m[it.id] || []).push(l.name || 'Look'); }));
    return m;
  }, [looks]);

  const card = `rounded-lg border p-5 sm:p-6 space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const live = (p) => p && (p.status || 'approved') === 'approved';
  const found = q.trim().length < 2 ? [] : products.filter((p) => live(p) && `${p.name} ${p.category} ${p.gender}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12);

  const start = (look) => { setForm(look ? { ...look, items: look.items.map((it) => ({ ...it })) } : { ...EMPTY }); setMsg(null); setPinFor(0); setQ(''); };
  const addItem = (p) => setForm((f) => (f.items.length >= LOOK_MAX_ITEMS || f.items.some((it) => it.id === String(p.id)) ? f
    : { ...f, items: [...f.items, { id: String(p.id), x: 50, y: 25 + f.items.length * 20 }] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, k) => k !== i) }));
  const place = (e) => {
    if (!form.items[pinFor]) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100);
    const y = Math.round(((e.clientY - r.top) / r.height) * 100);
    setForm((f) => ({ ...f, items: f.items.map((it, k) => (k === pinFor ? { ...it, x, y } : it)) }));
    setPinFor((i) => (i + 1 < form.items.length ? i + 1 : i));
  };

  const makeAi = async () => {
    if (form.items.length < 2) { setMsg({ type: 'err', text: 'Pick at least 2 products first.' }); return; }
    setBusy('ai'); setMsg(null); setStartedAt(Date.now());
    try {
      const raw = await makeAiLook({ sources: form.items.map((it) => absUrl((byId[it.id] || {}).image || '')), who: form.who, quality, variant: Math.floor(Math.random() * 16) });
      const image = await prepareLookImage(raw);
      setForm((f) => ({ ...f, image }));
      setMsg({ type: 'ok', text: 'Done. Check the clothes carefully (colour, print, logo). Then tap the picture to place the numbered pins, and Save.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    setBusy(''); setStartedAt(0);
  };
  // the same products as a saved look (in any order)
  const sameSet = form && form.items.length > 0 && (looks || []).find((l) => l.id !== form.id && l.items.length === form.items.length
    && form.items.every((it) => l.items.some((x) => x.id === it.id)));

  // ✨ Auto make: up to 4 men's looks from in-stock best sellers (jacket / shirt / tee / hoodie + cargo or pants + shoes),
  // saved and shown at once with pins in the usual places; change or delete any of them afterwards
  const [auto, setAuto] = useState('');
  // older looks were cut tight around the person; colour try-on needs the 2:3 frame (one click fixes them, pins move along)
  const [unframed, setUnframed] = useState([]);
  useEffect(() => {
    let live = true;
    Promise.all((looks || []).map(async (l) => ((await lookFramed(l.image).catch(() => true)) ? null : l.id)))
      .then((ids) => { if (live) setUnframed(ids.filter(Boolean)); });
    return () => { live = false; };
  }, [looks]);
  const fixFrames = async () => {
    setBusy('frame'); setMsg(null);
    let done = 0;
    for (const l of looks.filter((x) => unframed.includes(x.id))) {
      try { const r = await reframeLook(l.image, l.items); await saveLook({ ...l, image: r.image, items: r.items }, staff); done += 1; } catch (e) { setMsg({ type: 'err', text: `${l.name || 'Look'}: ${e.message}` }); }
    }
    setBusy('');
    setMsg((m) => m || { type: 'ok', text: `${done} look${done === 1 ? '' : 's'} ready for colour try-on.` });
  };
  const autoPlan = () => {
    const pool = rankBySales(products.filter((p) => (p.status || 'approved') === 'approved' && MEN_SIDE(p) && totalStock(p) > 0));
    const of = (k) => pool.filter((p) => pieceKind(p) === k);
    const tops = of('top'), bottoms = of('bottom'), shoes = of('shoes');
    const cargo = bottoms.filter((p) => /cargo/i.test(`${p.name} ${p.category}`));
    const used = new Set((looks || []).flatMap((l) => l.items.map((it) => it.id)));
    const fresh = (list, taken) => list.find((p) => !used.has(String(p.id)) && !taken.has(String(p.id))) || list.find((p) => !taken.has(String(p.id)));
    const taken = new Set();
    return AUTO.map((a, k) => {
      const top = fresh(tops.filter((p) => a.top.test(`${p.category} ${p.name}`)), taken);
      const bottom = fresh(k % 2 === 0 && cargo.length ? cargo : bottoms, taken) || fresh(bottoms, taken);
      const shoe = fresh(shoes, taken);
      [top, bottom, shoe].forEach((p) => p && taken.add(String(p.id)));
      const items = [top && ['top', top], bottom && ['bottom', bottom], shoe && ['shoes', shoe]].filter(Boolean);
      return items.length >= 2 ? { name: a.name, items } : null;
    }).filter(Boolean);
  };
  const autoMake = async () => {
    const plan = autoPlan();
    if (!plan.length) { setMsg({ type: 'err', text: 'Not enough in-stock tops, pants and shoes to make looks.' }); return; }
    const cost = quality === 'high' ? 0.25 : 0.06;
    if (!(await askConfirm(`Make ${plan.length} looks with AI (${QUALITY[quality].label}, about $${(plan.length * cost).toFixed(2)} of OpenAI credit)?\n\n${plan.map((l) => `${l.name}: ${l.items.map(([, p]) => p.name).join(' + ')}`).join('\n')}`, { confirmText: `Make ${plan.length} looks` }))) return;
    setBusy('auto'); setMsg(null);
    let done = 0; const failed = [];
    for (let k = 0; k < plan.length; k += 1) {
      const l = plan[k];
      setAuto(`Look ${k + 1} of ${plan.length}: ${l.name}`); setStartedAt(Date.now());
      try {
        const raw = await makeAiLook({ sources: l.items.map(([, p]) => absUrl(p.image || '')), who: 'men', quality, variant: k * 5 + Math.floor(Math.random() * 4) });
        const image = await prepareLookImage(raw);
        await saveLook({ name: l.name, who: 'men', image, active: true, order: (looks || []).length + k,
          items: l.items.map(([kind, p]) => ({ id: String(p.id), ...PIN[kind] })) }, staff);
        done += 1;
      } catch (e) { failed.push(`${l.name}: ${e.message}`); if (/credit|key|verify|team|sign in/i.test(e.message)) break; }
    }
    setBusy(''); setAuto(''); setStartedAt(0);
    setMsg({ type: failed.length ? 'err' : 'ok', text: `${done} look${done === 1 ? '' : 's'} made and shown on the home page. Check each one (Edit to move pins or make again).${failed.length ? ` Not made: ${failed.join('; ')}` : ''}` });
  };
  const timer = startedAt ? (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-gray-500"><span>⏱ {clock(secs)} {auto ? `· ${auto}` : '· OpenAI is dressing the model…'}</span><span>usually {quality === 'high' ? '1-3 min' : '30-60 s'}</span></div>
      <div className="h-1.5 rounded-full bg-gray-500/20 overflow-hidden"><div className="h-full bg-[#D4AF37] transition-all duration-1000" style={{ width: `${Math.min(95, (secs / QUALITY[quality].secs) * 90)}%` }} /></div>
    </div>
  ) : null;
  const qualityPick = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-gray-500">Picture quality:</span>
      {Object.entries(QUALITY).map(([k, q]) => (
        <button key={k} type="button" onClick={() => setQuality(k)} title={q.note} className={`px-3 py-1.5 rounded-full border font-semibold ${quality === k ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-gray-400'}`}>{q.label} <span className="font-normal opacity-70">{q.note}</span></button>
      ))}
    </div>
  );
  const upload = async (file) => {
    if (!file) return;
    setBusy('up'); setMsg(null);
    try { const image = await prepareLookImage(file); setForm((f) => ({ ...f, image })); } catch (e) { setMsg({ type: 'err', text: e.message }); }
    setBusy('');
  };
  const save = async () => {
    if (!form.image) { setMsg({ type: 'err', text: 'Make or upload the model picture first.' }); return; }
    if (!form.items.length) { setMsg({ type: 'err', text: 'Pick the products in this look.' }); return; }
    if (!form.id && (looks || []).length >= LOOK_MAX) { setMsg({ type: 'err', text: `At most ${LOOK_MAX} looks. Delete one first.` }); return; }
    setBusy('save'); setMsg(null);
    try { await saveLook(form, staff); setForm(null); } catch (e) {
      setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save (only the Owner or a Manager; or the picture is too big).' : e.message });
    }
    setBusy('');
  };
  const toggle = (look) => saveLook({ ...look, active: !look.active }, staff).catch((e) => alert(e.message));
  const remove = async (look) => {
    if (!(await askConfirm(`Delete the look "${look.name || 'Look'}"?`, { danger: true, confirmText: 'Delete' }))) return;
    deleteLook(look.id).catch((e) => alert(e.message));
  };

  if (!looks) return null;
  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Shop the Look</h3>
            <p className="text-xs text-gray-500 mt-1">Models wearing your products, on the home page between Men&apos;s and Women&apos;s Collection. Customers tap a model to see each piece with its price, stock and Add to cart. Pick 2-4 products, then ✨ Make with AI (OpenAI, about $0.05 a picture) or upload your own transparent PNG.</p>
          </div>
          {!form && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy} onClick={autoMake} className="px-4 py-2 rounded border border-[#D4AF37] text-[#9A7A1A] dark:text-[#D4AF37] text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50"><Sparkles size={14} /> {busy === 'auto' ? 'Making…' : 'Auto make 4 looks'}</button>
              <button type="button" disabled={!!busy} onClick={() => start(null)} className="px-4 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50"><Plus size={14} /> New look</button>
            </div>
          )}
        </div>
        {!form && unframed.length > 0 && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs flex flex-wrap items-center gap-2">
            <span className="flex-1 min-w-[12rem]">{unframed.length} older look{unframed.length === 1 ? '' : 's'} must be fixed once so customers can try other colours on the model (same picture, just framed; pins move along).</span>
            <button type="button" disabled={!!busy} onClick={fixFrames} className="px-3 py-1.5 rounded bg-[#D4AF37] text-black font-bold disabled:opacity-50">{busy === 'frame' ? 'Fixing…' : `Fix ${unframed.length} look${unframed.length === 1 ? '' : 's'}`}</button>
          </div>
        )}
        {!form && qualityPick}
        {!form && timer}
        {!form && msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        {!form && (looks.length === 0 ? <p className="text-sm text-gray-500">No looks yet.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {looks.map((l) => (
              <div key={l.id} className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} ${l.active ? '' : 'opacity-50'}`}>
                <div className="aspect-[2/3] bg-gray-100 dark:bg-[#0f0f0f] rounded flex items-end justify-center overflow-hidden"><img src={l.image} alt={l.name} className="h-full object-contain" /></div>
                <p className="mt-1.5 text-xs font-bold truncate">{l.name || 'Look'} <span className="font-normal text-gray-500">· {l.who === 'women' ? 'Women' : 'Men'} · {l.items.length} pcs</span></p>
                <p className={`mt-1 text-[10px] font-bold ${l.active ? 'text-green-600' : 'text-gray-500'}`}>{l.active ? '● LIVE on the home page' : '○ HIDDEN (customers do not see it)'}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <button type="button" onClick={() => toggle(l)} className={`flex-1 py-1 rounded text-[11px] font-bold ${l.active ? 'border border-gray-400' : 'bg-green-600 text-white'}`}>{l.active ? 'Hide' : 'Show on home'}</button>
                  <button type="button" onClick={() => start(l)} className="px-2 rounded border border-gray-400" aria-label="Edit"><Pencil size={13} /></button>
                  <button type="button" onClick={() => remove(l)} className="px-2 rounded border border-red-500 text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {form && (
        <div className={card}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">{form.id ? 'Edit look' : 'New look'}</h3>
            <button type="button" onClick={() => setForm(null)} className="p-1" aria-label="Close"><X size={18} /></button>
          </div>
          <fieldset disabled={!!busy} className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs font-semibold text-gray-500 col-span-2">Name (shown under the look)
                  <input className={`${input} w-full mt-1`} maxLength={40} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Eid Ready" />
                </label>
                <label className="text-xs font-semibold text-gray-500">Position
                  <input type="number" min="0" max="999" className={`${input} w-full mt-1`} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
                </label>
              </div>
              <div className="flex gap-2 text-xs">
                {[['men', 'Man'], ['women', 'Woman']].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, who: k }))} className={`px-3 py-1.5 rounded-full border font-semibold ${form.who === k ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-gray-400'}`}>{label}</button>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Products in this look ({form.items.length}/{LOOK_MAX_ITEMS}) · tap a number, then tap the picture to place its pin</p>
                <div className="space-y-1.5">
                  {form.items.map((it, i) => {
                    const p = byId[it.id];
                    return (
                      <div key={it.id} className={`flex items-center gap-2 rounded border p-1.5 ${pinFor === i ? 'border-[#D4AF37]' : isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <button type="button" onClick={() => setPinFor(i)} className={`w-6 h-6 rounded-full text-xs font-bold shrink-0 ${pinFor === i ? 'bg-[#D4AF37] text-black' : 'bg-gray-500/20'}`}>{i + 1}</button>
                        {p && <img src={p.image} alt="" className="w-9 h-9 object-cover rounded" />}
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold truncate">{p ? p.name : `Product ${it.id} (deleted)`}</p>
                          {p && <p className="text-gray-500">{formatPrice(p.price)} · {totalStock(p) > 0 ? `${totalStock(p)} in stock` : <span className="text-red-500 font-semibold">Out of stock</span>}</p>}
                          {looks.some((l) => l.id !== form.id && l.items.some((x) => x.id === it.id)) && (
                            <p className="text-[10px] text-[#B8921F] font-semibold">Already in: {looks.filter((l) => l.id !== form.id && l.items.some((x) => x.id === it.id)).map((l) => l.name || 'Look').join(', ')}</p>
                          )}
                        </div>
                        <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-500" aria-label="Remove"><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
                {form.items.length < LOOK_MAX_ITEMS && (
                  <div className="mt-2">
                    <input className={`${input} w-full`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a product to add (shirt, jeans, sneakers…)" />
                    {found.length > 0 && (
                      <div className={`mt-1 max-h-60 overflow-y-auto rounded border divide-y divide-gray-500/15 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        {found.map((p) => (
                          <button key={p.id} type="button" onClick={() => { addItem(p); setQ(''); }} className="w-full flex items-center gap-2 p-1.5 text-left text-xs hover:bg-[#D4AF37]/10">
                            <img src={p.image} alt="" className="w-8 h-8 object-cover rounded" />
                            <span className="flex-1 truncate">{p.name}{usedIn[String(p.id)] && <span className="ml-1 text-[10px] text-[#B8921F] font-semibold">· in {usedIn[String(p.id)].length} look{usedIn[String(p.id)].length > 1 ? 's' : ''}</span>}</span><span className="text-gray-500">{formatPrice(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={makeAi} className="px-4 py-2 rounded bg-gradient-to-b from-[#E9CB6B] to-[#B8921F] text-black text-xs font-bold uppercase flex items-center gap-1.5 disabled:opacity-50">
                  <Sparkles size={14} /> {busy === 'ai' ? 'Making…' : form.image ? 'Make again with AI' : 'Make with AI'}
                </button>
                <label className="px-4 py-2 rounded border border-gray-400 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer">
                  <Upload size={14} /> {busy === 'up' ? 'Loading…' : 'Upload PNG'}
                  <input type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => { upload(e.target.files[0]); e.target.value = ''; }} />
                </label>
              </div>
              {qualityPick}
              {timer}
              {sameSet && <p className="text-xs text-[#B8921F] font-semibold">These products already have a look: {sameSet.name || 'Look'}. You can still make another one (other model / pose).</p>}
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Show on the home page</label>
              {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : msg.type === 'err' ? 'text-red-500' : 'text-gray-500'}`}>{msg.text}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={save} className="px-5 py-2.5 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase disabled:opacity-50">{busy === 'save' ? 'Saving…' : 'Save look'}</button>
                <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded border border-gray-400 text-xs font-semibold">Cancel</button>
              </div>
            </div>
            <div className={`relative aspect-[2/3] max-h-[640px] mx-auto w-full max-w-[420px] rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#0f0f0f]' : 'bg-[#f1f1f0]'}`}>
              {form.image ? (
                <div className="absolute inset-0 cursor-crosshair" onClick={place}>
                  <img src={form.image} alt="" className="w-full h-full object-contain pointer-events-none select-none" />
                  {form.items.map((it, i) => (
                    <span key={it.id} style={{ left: `${it.x}%`, top: `${it.y}%` }} className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow ${pinFor === i ? 'bg-[#D4AF37] text-black' : 'bg-white text-black'}`}>{i + 1}</span>
                  ))}
                </div>
              ) : <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-500">{busy === 'ai' ? `Making the picture… ${clock(secs)}` : 'The model picture shows here.'}</p>}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
