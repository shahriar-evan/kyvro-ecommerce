import React, { useEffect, useState } from 'react';
import { TicketPercent, Trash2 } from 'lucide-react';
import { askConfirm } from './AlertCenter';
import { watchPromos, savePromos } from '../storeSettings';
import { cleanCouponCode, COUPON_MAX_PERCENT, STORE_COUPON_MAX } from '../data/priceCheck';

// Owner: Admin > Settings > Promo codes for the MAIN store (kyvro.store, not shop links; shops have their own).
// A code like KYVRO10 gives percent % off the products (after the automatic discount), with an optional minimum
// order, a ৳ cap (maxOff) and an end date. It comes out of Kyvro's own price. Saved in settings/promos.codes.
export default function StorePromoCodes({ isDarkMode, formatPrice, staff }) {
  const [codes, setCodes] = useState(null);
  const [form, setForm] = useState({ code: '', percent: '10', minOrder: '', maxOff: '', endsAt: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => watchPromos((d) => setCodes(d.codes || {})), []);
  if (!codes) return null;

  const input = `border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const save = async (next, ok) => {
    setBusy(true); setMsg(null);
    try { await savePromos(next, staff); setMsg({ type: 'ok', text: ok }); } catch (e) {
      setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Could not save: only the Owner can change promo codes (or the new rules are not published yet).' : e.message });
    }
    setBusy(false);
  };
  const add = () => {
    const code = cleanCouponCode(form.code);
    const percent = parseInt(form.percent, 10);
    const minOrder = Math.max(0, parseInt(form.minOrder, 10) || 0);
    const maxOff = Math.max(0, parseInt(form.maxOff, 10) || 0);
    if (code.length < 3) { setMsg({ type: 'err', text: 'Code: 3 to 15 letters or numbers, e.g. KYVRO10.' }); return; }
    if (!(percent >= 1 && percent <= COUPON_MAX_PERCENT)) { setMsg({ type: 'err', text: `Discount: 1 to ${COUPON_MAX_PERCENT}%.` }); return; }
    if (form.endsAt && !/^\d{4}-\d{2}-\d{2}$/.test(form.endsAt)) { setMsg({ type: 'err', text: 'End date is not valid.' }); return; }
    if (!codes[code] && Object.keys(codes).length >= STORE_COUPON_MAX) { setMsg({ type: 'err', text: `At most ${STORE_COUPON_MAX} codes. Delete one first.` }); return; }
    save({ ...codes, [code]: { percent, minOrder, maxOff, endsAt: form.endsAt || '', active: true } }, `${code} saved. Customers can use it at checkout now.`);
    setForm({ code: '', percent: '10', minOrder: '', maxOff: '', endsAt: '' });
  };
  const toggle = (code) => save({ ...codes, [code]: { ...codes[code], active: codes[code].active !== true } }, `${code} ${codes[code].active ? 'switched off' : 'switched on'}.`);
  const remove = async (code) => {
    if (!(await askConfirm(`Delete the promo code ${code}?`, { danger: true, confirmText: 'Delete' }))) return;
    const next = { ...codes }; delete next[code];
    save(next, `${code} deleted.`);
  };
  const expired = (c) => c.endsAt && Date.parse(`${c.endsAt}T23:59:59+06:00`) < Date.now();
  const day = (d) => new Date(`${d}T00:00:00+06:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={card}>
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2"><TicketPercent size={20} className="text-[#D4AF37]" />Promo codes (main store)</h3>
        <p className="text-xs text-gray-500 mt-1">Codes like <strong>KYVRO10</strong> for your ads and posts. Customers type it at checkout on kyvro.store and get % off the products (after the automatic discount, delivery not included). It comes out of Kyvro&apos;s price, so set a ৳ cap for big orders. Shop links do not take these codes (sellers have their own). Up to {STORE_COUPON_MAX} codes.</p>
      </div>
      <fieldset disabled={busy} className="space-y-4">
        {Object.keys(codes).length === 0 ? <p className="text-sm text-gray-500">No codes yet.</p> : (
          <div className="divide-y divide-gray-500/15 text-sm">
            {Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)).map(([code, c]) => (
              <div key={code} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold tracking-wider">{code} <span className="ml-1 px-2 py-0.5 rounded-full bg-green-600/15 text-green-600 text-[11px]">{c.percent}% off</span>
                    {expired(c) ? <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-500 text-[11px]">Ended</span> : c.active ? <span className="ml-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-[11px]">ON</span> : <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-400 text-white text-[11px]">OFF</span>}</p>
                  <p className="text-xs text-gray-500">{c.minOrder ? `Min. order ${formatPrice(c.minOrder)}` : 'No minimum'} · {c.maxOff ? `Up to ${formatPrice(c.maxOff)} off` : 'No ৳ cap'} · {c.endsAt ? `Ends ${day(c.endsAt)}` : 'No end date'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle(code)} className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">{c.active ? 'Switch off' : 'Switch on'}</button>
                  <button type="button" onClick={() => remove(code)} className="px-2 py-1.5 rounded border border-red-500 text-red-500" aria-label={`Delete ${code}`}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className={`rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <label className="text-xs font-semibold text-gray-500 col-span-2 sm:col-span-1">Code
            <input className={`${input} w-full mt-1 uppercase`} maxLength={15} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: cleanCouponCode(e.target.value) }))} placeholder="KYVRO10" />
          </label>
          <label className="text-xs font-semibold text-gray-500">% off
            <input type="number" min="1" max={COUPON_MAX_PERCENT} className={`${input} w-full mt-1`} value={form.percent} onChange={(e) => setForm((f) => ({ ...f, percent: e.target.value }))} />
          </label>
          <label className="text-xs font-semibold text-gray-500">Min. order (৳)
            <input type="number" min="0" className={`${input} w-full mt-1`} value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} placeholder="0" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Max off (৳)
            <input type="number" min="0" className={`${input} w-full mt-1`} value={form.maxOff} onChange={(e) => setForm((f) => ({ ...f, maxOff: e.target.value }))} placeholder="no cap" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Ends (optional)
            <input type="date" className={`${input} w-full mt-1`} value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
          </label>
          <button type="button" onClick={add} className="h-[38px] rounded bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider">Add code</button>
        </div>
      </fieldset>
      {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
}
