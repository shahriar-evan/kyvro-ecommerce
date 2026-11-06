import React, { useEffect, useState } from 'react';
import { watchPlans, savePlans } from '../storeSettings';
import { normalizePlans, planPrice, basicPrice } from '../data/priceCheck';
import { FEATURES, featureDefault, featureLockedFree } from '../data/shopBrand';

// Owner: the shop plan numbers (settings/plans). Basic (internal tier 'free') = freeLimit products, plus the card's
// Basic price (basic: list price, discount up to 100%, label, end date shown only). Charged only to stores opened while it costs something; Pro and Premium = all products for
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
  // per-plan feature switch: an explicit ON / OFF for that plan (normalizePlans keeps only true / false)
  const setFeat = (t, k, v) => setDraft((d) => { const tf = d.tierFeatures || {}; return { ...d, tierFeatures: { ...tf, [t]: { ...(tf[t] || {}), [k]: v } } }; });
  const setBasic = (k, v) => setDraft((d) => ({ ...d, basic: { ...(d.basic || {}), [k]: v } }));
  const preview = normalizePlans(draft);
  const basicDraft = draft.basic || preview.basic;
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
          <p className="text-xs text-gray-500 mt-1">Basic: a shop shows up to the Basic limit, from a few categories. Pro and Premium: all products and categories for the period. Managers, Admins and sellers follow the same plans; your own shop has no limit.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => set('enabled', e.target.checked)} className="accent-[#D4AF37] w-4 h-4" />
          Plans ON
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className={box}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Basic</p>
          <div className="grid grid-cols-2 gap-3">
            {num(draft.freeLimit, (v) => set('freeLimit', v), 'Products', '1 to 300')}
            {num(draft.freeCategoryLimit, (v) => set('freeCategoryLimit', v), 'Categories', '1 to 20')}
            {num(basicDraft.price, (v) => setBasic('price', v), 'Card price (৳)')}
            {num(basicDraft.discount, (v) => setBasic('discount', v), 'Discount %', '0 to 100')}
            <label className="text-xs font-semibold text-gray-500">Label
              <input className={input} maxLength={40} value={basicDraft.label ?? ''} onChange={(e) => setBasic('label', e.target.value)} placeholder="Launch offer" />
            </label>
            <label className="text-xs font-semibold text-gray-500">Offer end date
              <input type="date" className={input} value={basicDraft.endsAt || ''} onChange={(e) => setBasic('endsAt', e.target.value)} />
              <span className="block mt-1 font-normal text-[11px]">Shown on the card only</span>
            </label>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {preview.basic.discount > 0 && <span className="text-gray-500 line-through">{formatPrice(preview.basic.price)}</span>}
            <strong className="text-lg text-[#D4AF37]">{formatPrice(basicPrice(preview))}</strong>
            {preview.basic.discount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{preview.basic.discount}% OFF</span>}
            {preview.basic.discount > 0 && preview.basic.label && <span className="text-xs text-gray-500">{preview.basic.label}</span>}
          </p>
          <p className="text-[11px] text-gray-500">Up to {preview.freeLimit} products from {preview.freeCategoryLimit} categories. At 100% off (৳0) nobody pays. With less discount, only sellers who open their store from then on pay this price every {preview.periodDays} days (their store opens after payment); stores opened while Basic was ৳0 stay free for good. Back to 100% off = nobody pays.</p>
        </div>
        {tierBox('pro', 'Pro')}
        {tierBox('premium', 'Premium')}
      </div>
      <p className="text-[11px] text-gray-500">Pro and Premium: all products and all categories.</p>
      {/* how many shops one seller account may have (the Free products count across all of them) */}
      <div className={box}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Shops per seller account</p>
        <div className="grid grid-cols-3 gap-3">
          {[['free', 'Basic'], ['pro', 'Pro'], ['premium', 'Premium']].map(([t, l]) => (
            <label key={t} className="text-xs font-semibold text-gray-500">{l}
              <input type="number" min="1" max="5" className={input} value={(draft.shopLimits || {})[t] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, shopLimits: { ...(d.shopLimits || {}), [t]: e.target.value } }))} />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">1 to 5. Every new shop waits for your approval (Sellers tab). On Basic, the {preview.freeLimit} products count across all shops.</p>
      </div>

      {/* what each plan gets: ON / OFF per plan (a shop can still be switched one by one in Plan Members) */}
      {/* scrolls sideways inside its own box on a narrow phone instead of pushing the page wider */}
      <div className={`rounded border overflow-x-auto ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="min-w-[22rem]">
        <div className={`grid grid-cols-[1fr_repeat(3,4.5rem)] sm:grid-cols-[1fr_repeat(3,6rem)] gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <span>Plan features</span><span className="text-center">Basic</span><span className="text-center">Pro</span><span className="text-center">Premium</span>
        </div>
        <div className="divide-y divide-gray-500/10 text-xs">
          {FEATURES.filter((f) => f.key !== 'allProducts').map((f) => (
            <div key={f.key} className="grid grid-cols-[1fr_repeat(3,4.5rem)] sm:grid-cols-[1fr_repeat(3,6rem)] gap-2 px-3 py-1.5 items-center">
              <span className="font-semibold">{f.label}</span>
              {['free', 'pro', 'premium'].map((t) => {
                if (featureLockedFree(f.key, t)) return <span key={t} className="text-center text-gray-500" title="Never on the Basic plan">🔒</span>;
                const on = featureDefault(f.key, t, preview.tierFeatures);
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => setFeat(t, f.key, !on)}
                    className={`mx-auto w-14 py-1 rounded-full text-[10px] font-bold border transition ${on ? 'bg-green-600 border-green-600 text-white' : isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-500'}`}>{on ? 'ON' : 'OFF'}</button>
                );
              })}
            </div>
          ))}
        </div>
        </div>
        <p className="px-3 py-2 text-[11px] text-gray-500 border-t border-gray-500/10">Shop name change, logo and banner are never on the Basic plan. Plan Members can still switch a feature ON / OFF for one shop.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
