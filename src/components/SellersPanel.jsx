import React, { useEffect, useMemo, useState } from 'react';
import { askConfirm, askInput } from './AlertCenter';
import { watchAllShops } from '../shops';
import { watchSellers, watchSellerPayouts, watchSubscriptions, killSellerShop, reviveSellerShop, removeSeller, watchSellerRules, saveSellerRules, sellerStatus, approveSeller, rejectSeller } from '../sellers';
import { formatDateTime } from '../utils/dates';
import { watchPayouts, addPayout } from '../payouts';
import { toMillis } from '../data/priceCheck';

// a shop's markup on one order = (price the customer paid - store price) x pieces
const markupOf = (o) => (o.items || []).reduce((n, it) => n + Math.max(0, (Number(it.price) || 0) - (it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it.price) || 0)) * (parseInt(it.quantity, 10) || 0), 0);

// Owner: every public seller ("Sell on Kyvro") with their shop, plan, earnings (markup on delivered orders), what was
// paid, what is due, their bKash, Mark as paid, and the kill switch. Plus who may open a shop and the blocked names.
export default function SellersPanel({ orders = [], isDarkMode, formatPrice, loggedInUserEmail, adminName }) {
  const [sellers, setSellers] = useState([]);
  const [shops, setShops] = useState({});
  const [bkash, setBkash] = useState({});
  const [subs, setSubs] = useState({});
  const [payouts, setPayouts] = useState([]);
  const [rules, setRules] = useState(null);
  const [words, setWords] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => watchSellers(setSellers, (e) => setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Publish the latest Firestore rules first.' : e.message })), []);
  useEffect(() => watchAllShops((list) => setShops(Object.fromEntries(list.map((s) => [s.slug, s]))), () => {}), []);
  useEffect(() => watchSellerPayouts(setBkash), []);
  useEffect(() => watchSubscriptions(setSubs), []);
  useEffect(() => watchPayouts(true, loggedInUserEmail, setPayouts, () => {}), [loggedInUserEmail]);
  useEffect(() => watchSellerRules((r) => { setRules(r); setWords((w) => w || r.blockedWords.join(', ')); }), []);

  const pending = sellers.filter((s) => sellerStatus(s) === 'pending');
  const rejectedCount = sellers.filter((s) => sellerStatus(s) === 'rejected').length;
  const rows = useMemo(() => sellers.filter((s) => sellerStatus(s) === 'approved').map((s) => {
    const shop = shops[s.slug] || null;
    const mine = orders.filter((o) => o.shop === s.slug);
    const earned = mine.filter((o) => o.status === 'Delivered' && !o.returned).reduce((n, o) => n + markupOf(o), 0);
    const paid = payouts.filter((p) => String(p.email || '').toLowerCase() === String(s.email || '').toLowerCase()).reduce((n, p) => n + (Number(p.amount) || 0), 0);
    const until = toMillis((subs[s.uid] || {}).paidUntil);
    return { ...s, shop, orders: mine.length, earned, paid, due: earned - paid, until, bkash: (bkash[s.uid] || {}).bkash || '' };
  }).sort((a, b) => b.due - a.due), [sellers, shops, orders, payouts, subs, bkash]);

  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const btn = 'px-3 py-1.5 rounded text-[11px] font-bold';
  const act = async (key, fn, ok) => { setBusy(key); setMsg(null); try { await fn(); if (ok) setMsg({ type: 'ok', text: ok }); } catch (e) { setMsg({ type: 'err', text: e.message }); } setBusy(''); };

  const pay = async (r) => {
    const a = await askInput(`Paid ${r.name || r.email}? Amount in taka (due: ${formatPrice(Math.max(0, r.due))})${r.bkash ? `\nbKash: ${r.bkash}` : ''}`, { placeholder: 'e.g. 500', initial: r.due > 0 ? String(Math.round(r.due)) : '' });
    if (a === null || a === undefined || !(Number(a) > 0)) return;
    const note = await askInput('Note (optional, e.g. bKash TrxID):', { placeholder: 'e.g. TrxID 8N7...' });
    act(r.uid, () => addPayout(r.email, r.name || r.shop?.name || '', Number(a), note || '', { email: loggedInUserEmail }), 'Payment saved.');
  };
  const kill = async (r) => {
    const note = await askInput(`Switch off "${r.shop ? r.shop.name : r.slug}" for good? The seller cannot switch it on again. Reason (the seller sees it):`, { placeholder: 'e.g. uses the Kyvro name' });
    if (note === null || note === undefined) return;
    act(r.uid, () => killSellerShop(r.slug, note), 'Shop switched off.');
  };
  const remove = async (r) => {
    if (!(await askConfirm(`Remove the seller ${r.email} and their shop? Their orders stay. The account could open a new shop later.`, { danger: true, confirmText: 'Remove' }))) return;
    act(r.uid, () => removeSeller(r), 'Seller removed.');
  };
  const staff = { email: loggedInUserEmail, name: adminName };
  const approve = async (s) => {
    if (!(await askConfirm(`Approve "${shops[s.slug] ? shops[s.slug].name : s.slug}" by ${s.name || s.email}? The shop goes live on the Free plan.`))) return;
    act(s.uid, () => approveSeller(s, staff), 'Seller approved: the shop is live.');
  };
  const reject = async (s) => {
    const note = await askInput(`Reject the application of ${s.name || s.email}? Write the reason (the seller sees it and can apply again):`, { placeholder: 'e.g. please add your Facebook page link' });
    if (note === null || note === undefined) return;
    act(s.uid, () => rejectSeller(s, note, staff), 'Application rejected.');
  };
  const saveRules = (open) => act('rules', () => saveSellerRules({ open: open === undefined ? rules.open : open, blockedWords: words.split(',') }, { email: loggedInUserEmail, name: adminName }), 'Seller settings saved.');

  return (
    <div className="space-y-5">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Sellers</h3>
            <p className="text-xs text-gray-500 mt-1">Customers who opened a shop with "Sell on Kyvro". They earn only the markup on delivered orders; you confirm and deliver every order. They never see supplier details or customers' details.</p>
          </div>
          {rules && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={rules.open} disabled={busy === 'rules'} onChange={(e) => saveRules(e.target.checked)} className="accent-[#D4AF37] w-4 h-4" />
              New sellers allowed
            </label>
          )}
        </div>
        <label className="block text-xs font-semibold text-gray-500">Blocked words in shop names and links (comma separated)
          <div className="flex flex-wrap gap-2 mt-1">
            <input value={words} onChange={(e) => setWords(e.target.value)} className={`flex-1 min-w-[12rem] border p-2 text-sm rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`} />
            <button type="button" disabled={busy === 'rules' || !rules} onClick={() => saveRules()} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-50">Save</button>
          </div>
        </label>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>

      {pending.length > 0 && (
        <div className={`${card} border-[#D4AF37]/60`}>
          <h3 className="text-lg font-bold">Pending applications <span className="ml-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs align-middle">{pending.length}</span></h3>
          <p className="text-xs text-gray-500">These shops are switched off until you approve them. Reject removes the shop; the person sees your note and can apply again.</p>
          <div className="divide-y text-xs">
            {pending.map((s) => {
              const row = (k, v, link) => (v ? <p><span className="text-gray-500">{k}:</span> {link ? <a href={v} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline break-all">{v}</a> : <span className="break-words">{v}</span>}</p> : null);
              return (
                <div key={s.uid} className="py-3 space-y-2">
                  <p className="font-bold text-sm">{shops[s.slug] ? shops[s.slug].name : s.slug} <span className="font-normal text-xs text-gray-500">· applied {formatDateTime(s.createdAt)}</span></p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                    {row('Full name', s.name)}
                    {row('Email', s.email)}
                    {row('WhatsApp', s.whatsapp)}
                    {row('District / area', [s.district, s.area].filter(Boolean).join(', '))}
                    {row('Address', s.address)}
                    {row('Page', s.pageLink, true)}
                    <div className="sm:col-span-2">{row('Categories', Array.isArray(s.categories) && s.categories.length ? s.categories.join(', ') : '')}</div>
                    <div className="sm:col-span-2">{row('Note', s.productNote)}</div>
                    {row('Independent seller confirmed', s.agreed ? 'Yes' : 'No')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`${window.location.origin}/?shop=${s.slug}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-gray-400`}>Open link</a>
                    <button type="button" disabled={busy === s.uid} onClick={() => approve(s)} className={`${btn} bg-green-600 text-white disabled:opacity-50`}>Approve</button>
                    <button type="button" disabled={busy === s.uid} onClick={() => reject(s)} className={`${btn} border border-red-500 text-red-500 disabled:opacity-50`}>Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={card}>
        {rejectedCount > 0 && <p className="text-[11px] text-gray-500">{rejectedCount} rejected application(s) waiting for the person to apply again.</p>}
        {rows.length === 0 ? <p className="text-sm text-gray-500">No approved sellers yet.</p> : (
          <div className="divide-y text-xs">
            {rows.map((r) => {
              const on = r.shop && r.shop.active !== false;
              return (
                <div key={r.uid} className="py-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">{r.shop ? r.shop.name : r.slug} <span className="font-normal text-gray-500">· {r.name || ''} {r.email}</span></p>
                      <p className="text-gray-500 break-all">{window.location.origin}/?shop={r.slug} · {r.shop ? Object.keys(r.shop.items || {}).length : 0} products · {r.orders} order(s) · {r.until > Date.now() ? `Paid until ${new Date(r.until).toLocaleDateString('en-GB')}` : 'Free plan'}</p>
                      <p className="text-gray-500">bKash: {r.bkash || 'not given yet'}</p>
                      {r.shop && r.shop.killed && <p className="text-red-500 font-semibold">Switched off by you{r.shop.killNote ? `: ${r.shop.killNote}` : ''}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${on ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>{on ? 'LIVE' : 'OFF'}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Earned <strong className="text-[#D4AF37]">{formatPrice(r.earned)}</strong> · Paid <strong className="text-green-600">{formatPrice(r.paid)}</strong> · {r.due >= 0 ? 'Due' : 'Overpaid'} <strong className={r.due > 0 ? 'text-red-500' : 'text-green-600'}>{formatPrice(Math.abs(r.due))}</strong></span>
                    <div className="flex flex-wrap gap-2">
                      <a href={`${window.location.origin}/?shop=${r.slug}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-gray-400`}>Open link</a>
                      <button type="button" disabled={busy === r.uid} onClick={() => pay(r)} className={`${btn} bg-green-600 text-white disabled:opacity-50`}>Mark as paid</button>
                      {r.shop && (r.shop.killed
                        ? <button type="button" disabled={busy === r.uid} onClick={() => act(r.uid, () => reviveSellerShop(r.slug), 'Shop is live again.')} className={`${btn} border border-green-600 text-green-600 disabled:opacity-50`}>Revive</button>
                        : <button type="button" disabled={busy === r.uid} onClick={() => kill(r)} className={`${btn} bg-red-600 text-white disabled:opacity-50`}>Kill switch</button>)}
                      <button type="button" disabled={busy === r.uid} onClick={() => remove(r)} className={`${btn} border border-red-500 text-red-500 disabled:opacity-50`}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
