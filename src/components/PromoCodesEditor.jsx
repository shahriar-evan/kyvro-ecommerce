import React, { useEffect, useState } from 'react';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { TicketPercent, Trash2 } from 'lucide-react';
import { askConfirm } from './AlertCenter';
import { cleanCouponCode, COUPON_MAX, COUPON_MAX_PERCENT } from '../data/priceCheck';

// Seller dashboard -> Promo Codes (Premium "coupons"): up to 5 codes per shop. A code gives the shop's customers
// percent % off the products (1-50), with an optional minimum order and end date. The discount comes out of the
// seller's own markup (never more than it), so Kyvro's store price never changes. Saved on shops/{slug}.coupons.
export default function PromoCodesEditor({ shops = [], products = [], isDarkMode, readOnly = false, formatPrice }) {
  const [slug, setSlug] = useState(shops[0] ? shops[0].slug : '');
  useEffect(() => { if (!shops.find((s) => s.slug === slug) && shops[0]) setSlug(shops[0].slug); }, [shops]); // eslint-disable-line react-hooks/exhaustive-deps
  const shop = shops.find((s) => s.slug === slug) || null;
  const coupons = (shop && shop.coupons && typeof shop.coupons === 'object') ? shop.coupons : {};
  const [form, setForm] = useState({ code: '', percent: '10', minOrder: '', endsAt: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const input = `border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  const save = async (next, ok) => {
    setBusy(true); setMsg(null);
    try {
      await updateDoc(doc(getFirestore(getApp()), 'shops', shop.slug), { coupons: next, updatedAt: new Date().toISOString() });
      setMsg({ type: 'ok', text: ok });
    } catch (e) {
      setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save: promo codes are a Premium feature.' : e.message });
    }
    setBusy(false);
  };
  const add = () => {
    const code = cleanCouponCode(form.code);
    const percent = parseInt(form.percent, 10);
    const minOrder = Math.max(0, parseInt(form.minOrder, 10) || 0);
    if (code.length < 3) { setMsg({ type: 'err', text: 'Code: 3 to 15 letters or numbers, e.g. EID10.' }); return; }
    if (!(percent >= 1 && percent <= COUPON_MAX_PERCENT)) { setMsg({ type: 'err', text: `Discount: 1 to ${COUPON_MAX_PERCENT}%.` }); return; }
    if (form.endsAt && !/^\d{4}-\d{2}-\d{2}$/.test(form.endsAt)) { setMsg({ type: 'err', text: 'End date is not valid.' }); return; }
    if (!coupons[code] && Object.keys(coupons).length >= COUPON_MAX) { setMsg({ type: 'err', text: `At most ${COUPON_MAX} codes. Delete one first.` }); return; }
    save({ ...coupons, [code]: { percent, minOrder, endsAt: form.endsAt || '', active: true } }, `${code} saved.`);
    setForm({ code: '', percent: '10', minOrder: '', endsAt: '' });
  };
  const toggle = (code) => save({ ...coupons, [code]: { ...coupons[code], active: coupons[code].active !== true } }, `${code} ${coupons[code].active ? 'switched off' : 'switched on'}.`);
  const remove = async (code) => {
    if (!(await askConfirm(`Delete the promo code ${code}?`, { danger: true, confirmText: 'Delete' }))) return;
    const next = { ...coupons }; delete next[code];
    save(next, `${code} deleted.`);
  };
  // products whose markup is smaller than the % being typed: there the discount stops at the markup
  const pct = parseInt(form.percent, 10) || 0;
  const lowMarkup = shop ? Object.entries(shop.items || {}).filter(([id, price]) => {
    const p = products.find((x) => String(x.id) === String(id));
    const sell = Number(price) || 0;
    const base = p ? Number(p.price) || 0 : sell;
    return sell > 0 && ((sell - base) / sell) * 100 < pct;
  }).length : 0;
  const expired = (c) => c.endsAt && Date.parse(`${c.endsAt}T23:59:59+06:00`) < Date.now();

  if (!shop) return <div className={card}><p className="text-sm text-gray-500">No shop yet.</p></div>;
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><TicketPercent size={20} className="text-[#D4AF37]" />Promo Codes</h3>
          <p className="text-xs text-gray-500 mt-1">Give your customers a code like <strong>EID10</strong> for % off. The discount comes out of your markup (never more than it), so share codes your markup can cover. Up to {COUPON_MAX} codes per shop.</p>
          <p className="text-xs text-gray-500">কাস্টমাররা চেকআউটে কোড দিলে ছাড় পাবে। ছাড়টা আপনার মার্কআপ থেকে কাটা হবে, Kyvro-র দাম থেকে না।</p>
        </div>
        {shops.length > 1 && (
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className={input} aria-label="Shop">
            {shops.map((s) => <option key={s.slug} value={s.slug}>{s.handle || s.slug}</option>)}
          </select>
        )}
      </div>

      <fieldset disabled={readOnly || busy} className="space-y-4">
        {Object.keys(coupons).length === 0 ? <p className="text-sm text-gray-500">No codes yet.</p> : (
          <div className="divide-y divide-gray-500/15 text-sm">
            {Object.entries(coupons).sort(([a], [b]) => a.localeCompare(b)).map(([code, c]) => (
              <div key={code} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold tracking-wider">{code} <span className="ml-1 px-2 py-0.5 rounded-full bg-green-600/15 text-green-600 text-[11px]">{c.percent}% off</span>
                    {expired(c) ? <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-500 text-[11px]">Ended</span> : c.active ? <span className="ml-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-[11px]">ON</span> : <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-400 text-white text-[11px]">OFF</span>}</p>
                  <p className="text-xs text-gray-500">{c.minOrder ? `Min. order ${formatPrice(c.minOrder)}` : 'No minimum'} · {c.endsAt ? `Ends ${new Date(`${c.endsAt}T00:00:00+06:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No end date'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle(code)} className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">{c.active ? 'Switch off' : 'Switch on'}</button>
                  <button type="button" onClick={() => remove(code)} className="px-2 py-1.5 rounded border border-red-500 text-red-500" aria-label={`Delete ${code}`}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <label className="text-xs font-semibold text-gray-500 col-span-2 sm:col-span-1">Code
            <input className={`${input} w-full mt-1 uppercase`} maxLength={15} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: cleanCouponCode(e.target.value) }))} placeholder="EID10" />
          </label>
          <label className="text-xs font-semibold text-gray-500">% off
            <input type="number" min="1" max={COUPON_MAX_PERCENT} className={`${input} w-full mt-1`} value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))} />
          </label>
          <label className="text-xs font-semibold text-gray-500">Min. order (৳)
            <input type="number" min="0" className={`${input} w-full mt-1`} value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} placeholder="0" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Ends (optional)
            <input type="date" className={`${input} w-full mt-1`} value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
          </label>
          <button type="button" onClick={add} className="h-[38px] rounded bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider">Add code</button>
        </div>
        {pct > 0 && lowMarkup > 0 && (
          <p className="rounded border border-amber-500/50 bg-amber-500/10 p-2.5 text-xs text-amber-700">
            ⚠ {lowMarkup} of your {Object.keys(shop.items || {}).length} products have less markup than {pct}%. On those, the discount stops at your markup, so the customer gets less than {pct}% off.
            <span className="block mt-0.5">আপনার {lowMarkup}টি পণ্যে মার্কআপ {pct}%-এর কম, সেগুলোতে ছাড় আপনার মার্কআপ পর্যন্তই হবে।</span>
          </p>
        )}
      </fieldset>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
}
