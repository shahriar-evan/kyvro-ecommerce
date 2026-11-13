import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Upload, Trash2, Pencil, Plus, X } from 'lucide-react';
import { askConfirm } from './AlertCenter';
import { watchLooks, saveLook, deleteLook, LOOK_MAX_ITEMS, LOOK_MAX } from '../looks';
import { makeAiLook } from '../aiPhoto';
import { prepareLookImage } from '../utils/showcaseImage';
import { totalStock } from '../data/catalog';

// Admin → Shop the Look (Owner / Manager). A look = a full-body model picture (transparent) + the 1-4 store products
// worn in it, each with a numbered pin on the picture. ✨ Make with AI (OpenAI) dresses a model in the picked products;
// or upload your own transparent PNG. Shown on the home page between the Men's and Women's rails (ShopTheLook.jsx).
const EMPTY = { id: '', name: '', who: 'men', image: '', items: [], order: 0, active: true };
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
    setBusy('ai'); setMsg({ type: 'info', text: 'OpenAI is dressing the model… this takes about 30-60 seconds.' });
    try {
      const raw = await makeAiLook({ sources: form.items.map((it) => absUrl((byId[it.id] || {}).image || '')), who: form.who });
      const image = await prepareLookImage(raw);
      setForm((f) => ({ ...f, image }));
      setMsg({ type: 'ok', text: 'Done. Check the clothes carefully (colour, print, logo). Then tap the picture to place the numbered pins, and Save.' });
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    setBusy('');
  };
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
          {!form && <button type="button" onClick={() => start(null)} className="px-4 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold uppercase flex items-center gap-1.5"><Plus size={14} /> New look</button>}
        </div>
        {!form && (looks.length === 0 ? <p className="text-sm text-gray-500">No looks yet.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {looks.map((l) => (
              <div key={l.id} className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} ${l.active ? '' : 'opacity-50'}`}>
                <div className="aspect-[2/3] bg-gray-100 dark:bg-[#0f0f0f] rounded flex items-end justify-center overflow-hidden"><img src={l.image} alt={l.name} className="h-full object-contain" /></div>
                <p className="mt-1.5 text-xs font-bold truncate">{l.name || 'Look'} <span className="font-normal text-gray-500">· {l.who === 'women' ? 'Women' : 'Men'} · {l.items.length} pcs</span></p>
                <div className="mt-1.5 flex gap-1.5">
                  <button type="button" onClick={() => toggle(l)} className={`flex-1 py-1 rounded text-[11px] font-bold ${l.active ? 'bg-green-600 text-white' : 'border border-gray-400'}`}>{l.active ? 'ON' : 'OFF'}</button>
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
                            <span className="flex-1 truncate">{p.name}</span><span className="text-gray-500">{formatPrice(p.price)}</span>
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
              ) : <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-500">{busy === 'ai' ? 'Making the picture…' : 'The model picture shows here.'}</p>}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
