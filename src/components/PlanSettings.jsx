import React, { useEffect, useState } from 'react';
import { watchPlans, savePlans } from '../storeSettings';
import { normalizePlans, planPrice } from '../data/priceCheck';

// Owner: the shop plan numbers (settings/plans). Free = freeLimit products; Pro and Premium = all products for
// periodDays, each with its own price and discount %. The payment server always reads the price from here.
export default function PlanSettings({ isDarkMode, staff, formatPrice }) {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => watchPlans((p) => { setSaved(p); setDraft((d) => d || p); }), []);
  if (!draft) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setTier = (t, k, v) => setDraft((d) => ({ ...d, [t]: { ...d[t], [k]: v } }));
  const preview = normalizePlans(draft);
  const dirty = JSON.stringify(preview) !== JSON.stringify(saved);
  const card = `rounded-lg border p-5 sm:p-6 space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `block mt-1 w-full border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const box = `rounded border p-3 space-y-3 ${isDarkMode ? 'border-[#D4AF37]/30 bg-[#121212]' : 'border-[#D4AF37]/40 bg-[#D4AF37]/5'}`;
  const num = (value, onChange, label, hint) => (
    <label className="text-xs font-semibold text-gray-500">{label}
      <input type="number" min="0" className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="block mt-1 font-normal text-[11px]">{hint}</span>}
    </label>
  );
  const tierBox = (t, label) => (
    <div className={box}>
      <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {num(draft[t].price, (v) => setTier(t, 'price', v), 'Price (৳)')}
        {num(draft[t].discount, (v) => setTier(t, 'discount', v), 'Discount %', '0 to 90')}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {preview[t].discount > 0 && <span className="text-gray-500 line-through">{formatPrice(preview[t].price)}</span>}
        <strong className="text-lg text-[#D4AF37]">{formatPrice(planPrice(preview, t))}</strong>
        {preview[t].discount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{preview[t].discount}% OFF</span>}
        <span className="text-xs text-gray-500">/ {preview.periodDays} days</span>
      </p>
    </div>
  );

  const save = async () => {
    setMsg(null); setBusy(true);
    try { await savePlans(preview, staff); setDraft(preview); setMsg({ type: 'ok', text: 'Shop plans saved.' }); }
    catch (err) { setMsg({ type: 'err', text: err.code === 'permission-denied' ? 'Could not save: publish the latest Firestore rules first.' : err.message }); }
    setBusy(false);
  };

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Shop plans</h3>
          <p className="text-xs text-gray-500 mt-1">Free: a shop shows up to the free limit. Pro and Premium: all products for the period. Managers, Admins and sellers follow the same plans; your own shop has no limit.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#D4AF37] w-4 h-4" />
          Plans ON
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {tierBox('pro', 'Pro')}
        {tierBox('premium', 'Premium')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {num(draft.freeLimit, (v) => set('freeLimit', v), 'Free plan products', '1 to 300')}
        {num(draft.periodDays, (v) => set('periodDays', v), 'Paid period (days)')}
        {num(draft.reminderDays, (v) => set('reminderDays', v), 'Reminder before end (days)')}
        <label className="text-xs font-semibold text-gray-500">Priority support WhatsApp
          <input className={input} value={draft.supportWhatsapp || ''} onChange={(e) => set('supportWhatsapp', e.target.value)} placeholder="01712345678" />
          <span className="block mt-1 font-normal text-[11px]">Premium sellers see this</span>
        </label>
      </div>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || !dirty} onClick={save} className="bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest disabled:opacity-40">{busy ? 'Saving...' : 'Save plans'}</button>
        <button type="button" disabled={busy || !dirty} onClick={() => { setDraft(saved); setMsg(null); }} className="px-4 py-2.5 rounded border border-gray-400 text-xs font-bold uppercase tracking-wider disabled:opacity-40">Discard</button>
      </div>
    </div>
  );
}
