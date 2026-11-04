import React, { useEffect, useState } from 'react';
import { watchPlans, savePlans } from '../storeSettings';
import { normalizePlans, planPrice } from '../data/priceCheck';

// Owner: the shop plan numbers (settings/plans). Free = freeLimit products, Paid = all products for periodDays at
// originalPrice minus discountPercent. The payment server always reads the price from here.
export default function PlanSettings({ isDarkMode, staff, formatPrice }) {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => watchPlans((p) => { setSaved(p); setDraft((d) => d || p); }), []);
  if (!draft) return null;

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const preview = normalizePlans(draft);
  const price = planPrice(preview);
  const dirty = JSON.stringify(preview) !== JSON.stringify(saved);
  const card = `rounded-lg border p-5 sm:p-6 space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const input = `block mt-1 w-full border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const field = (k, label, hint) => (
    <label className="text-xs font-semibold text-gray-500">{label}
      <input type="number" min="0" className={input} value={draft[k]} onChange={(e) => set(k, e.target.value)} />
      {hint && <span className="block mt-1 font-normal text-[11px]">{hint}</span>}
    </label>
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
          <p className="text-xs text-gray-500 mt-1">Free: a team shop shows up to the free limit. Paid: all products for the period. Managers and Admins follow the same plan; your own shop has no limit.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#D4AF37] w-4 h-4" />
          Plans ON
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {field('originalPrice', 'Original price (৳)')}
        {field('discountPercent', 'Discount %', '0 to 90')}
        {field('freeLimit', 'Free plan products', '1 to 300')}
        {field('periodDays', 'Paid period (days)')}
        {field('reminderDays', 'Reminder before end (days)')}
      </div>
      <div className={`rounded border p-3 flex flex-wrap items-center gap-3 ${isDarkMode ? 'border-[#D4AF37]/30 bg-[#121212]' : 'border-[#D4AF37]/40 bg-[#D4AF37]/5'}`}>
        <span className="text-xs text-gray-500">Customers see:</span>
        {preview.discountPercent > 0 && <span className="text-sm text-gray-500 line-through">{formatPrice(preview.originalPrice)}</span>}
        <span className="text-xl font-bold text-[#D4AF37]">{formatPrice(price)}</span>
        {preview.discountPercent > 0 && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{preview.discountPercent}% OFF</span>}
        <span className="text-xs text-gray-500">/ {preview.periodDays} days · Free shows {preview.freeLimit} products</span>
      </div>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || !dirty} onClick={save} className="bg-[#D4AF37] text-black font-bold px-6 py-2.5 rounded text-xs uppercase tracking-widest disabled:opacity-40">{busy ? 'Saving...' : 'Save plans'}</button>
        <button type="button" disabled={busy || !dirty} onClick={() => { setDraft(saved); setMsg(null); }} className="px-4 py-2.5 rounded border border-gray-400 text-xs font-bold uppercase tracking-wider disabled:opacity-40">Discard</button>
      </div>
    </div>
  );
}
