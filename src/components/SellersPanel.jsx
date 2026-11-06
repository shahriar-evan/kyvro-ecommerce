import React, { useEffect, useMemo, useState } from 'react';
import { askConfirm, askInput } from './AlertCenter';
import { watchAllShops, acceptShop } from '../shops';
import { auth } from '../firebase';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { watchSellers, watchSellerPayouts, watchSubscriptions, killSellerShop, reviveSellerShop, removeSeller, watchSellerRules, saveSellerRules, sellerStatus, approveSeller, rejectSeller, rejectSellerShop, sellerShopList } from '../sellers';
import { formatDateTime } from '../utils/dates';
import { watchPayouts, addPayout } from '../payouts';
import { toMillis, effectiveTier, normalizePlans } from '../data/priceCheck';
import { watchPlans } from '../storeSettings';
import { effectiveFeatures } from '../data/shopBrand';
import SellerDashboard from './SellerDashboard';

// a shop's markup on one order = (price the customer paid - store price) x pieces
const markupOf = (o) => (o.items || []).reduce((n, it) => n + Math.max(0, (Number(it.price) || 0) - (it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it.price) || 0)) * (parseInt(it.quantity, 10) || 0), 0);

// Owner: every public seller ("Sell on Kyvro") with their shop, plan, earnings (markup on delivered orders), what was
// paid, what is due, their bKash, Mark as paid, and the kill switch. Plus who may open a shop and the blocked names.
// the seller's payout details (sellerPayout/{uid}) as lines: bKash numbers and bank accounts
const payoutLines = (p) => {
  if (!p) return [];
  const out = [[p.bkash, p.bkashName], [p.bkash2, p.bkash2Name]].filter(([n]) => n).map(([n, name]) => `bKash: ${n}${name ? ` (${name})` : ''}`);
  (Array.isArray(p.banks) ? p.banks : []).forEach((b) => {
    out.push(`Bank: ${b.bank} · A/C ${b.account} · ${b.holder} · ${b.branch} branch${b.routing ? ` · Routing ${b.routing}` : ''}${b.swift ? ` · SWIFT ${b.swift}` : ''}`);
  });
  return out;
};

export default function SellersPanel({ orders = [], products = [], isDarkMode, formatPrice, loggedInUserEmail, adminName }) {
  // View dashboard: the seller's own dashboard, read-only, read with the Owner's login
  const [viewing, setViewing] = useState(null);
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
  const [plans, setPlans] = useState(() => normalizePlans(null));
  useEffect(() => watchPlans(setPlans), []);
  useEffect(() => watchPayouts(true, loggedInUserEmail, setPayouts, () => {}), [loggedInUserEmail]);
  useEffect(() => watchSellerRules((r) => { setRules(r); setWords((w) => w || r.blockedWords.join(', ')); }), []);

  // the plan an applicant picked (saved in the note); Pro / Premium applicants come first (priority approval)
  const chosenTier = (s) => {
    // the Owner / a Manager can switch priority approval on or off for a shop
    const pa = shops[s.slug] && shops[s.slug].features && shops[s.slug].features.priorityApproval;
    if (pa === false) return 'free';
    if (pa === true) return 'pro';
    const m = /Chose the (Pro|Premium|Paid) plan/.exec(String(s.productNote || '')); return !m ? 'free' : m[1] === 'Premium' ? 'premium' : 'pro'; };
  const rank = { premium: 0, pro: 1, free: 2 };
  const pending = sellers.filter((s) => sellerStatus(s) === 'pending')
    .sort((a, b) => (rank[chosenTier(a)] - rank[chosenTier(b)]) || (toMillis(a.createdAt) - toMillis(b.createdAt)));
  const rejectedCount = sellers.filter((s) => sellerStatus(s) === 'rejected').length;
  const rows = useMemo(() => sellers.filter((s) => sellerStatus(s) === 'approved').map((s) => {
    const shop = shops[s.slug] || null;
    // every shop this seller owns: earnings and payout are counted together
    const own = new Set(sellerShopList(s).filter((x) => x === s.slug || (shops[x] && shops[x].ownerUid === s.uid)));
    const mine = orders.filter((o) => own.has(o.shop));
    const earned = mine.filter((o) => o.status === 'Delivered' && !o.returned).reduce((n, o) => n + markupOf(o), 0);
    const paid = payouts.filter((p) => String(p.email || '').toLowerCase() === String(s.email || '').toLowerCase()).reduce((n, p) => n + (Number(p.amount) || 0), 0);
    const until = toMillis((subs[s.uid] || {}).paidUntil);
    const tier = effectiveTier(subs[s.uid] || null);
    const feat = effectiveFeatures(shop, shop ? effectiveTier(shop) : tier, plans.tierFeatures);
    return { ...s, tier, feat, shop, shopCount: own.size, orders: mine.length, earned, paid, due: earned - paid, until, payTo: payoutLines(bkash[s.uid]) };
  }).sort((a, b) => b.due - a.due), [sellers, shops, orders, payouts, subs, bkash, plans]);

  // days since the seller last signed in (shops without orders are removed after 30 days without a visit)
  const seenDays = (s) => { const t = toMillis(s.lastSeenAt) || toMillis(s.createdAt); return t ? Math.floor((Date.now() - t) / 86400000) : null; };
  const seenText = (s) => { const d = seenDays(s); return d === null ? '' : d <= 0 ? 'seen today · ' : `seen ${d} day${d === 1 ? '' : 's'} ago${d >= 25 ? ' (Free, no open orders, nothing due: removed at 30 days, 60 if paid before)' : d >= 7 ? ' (warned by email)' : ''} · `; };
  // Owner: warn a seller about one shop (note saved on the shop and emailed to the seller), before removing it
  const warnShop = async (x) => {
    const note = await askInput(`Warning for "${x.name}" (the seller sees it on My Shop and gets it by email):`);
    if (!note || !String(note).trim()) return;
    act(x.slug, async () => {
      const t = await auth.currentUser.getIdToken();
      const r = await fetch('/api/plan?action=warn', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: x.slug, note: String(note).trim() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not send the warning.');
    }, 'Warning sent to the seller.');
  };
  // a shop hidden by the daily job (seller inactive, but with open orders or money due): live again
  const unholdShop = (x) => act(x.slug, () => updateDoc(doc(getFirestore(getApp()), 'shops', x.slug), { active: true, inactiveHold: false, updatedAt: new Date().toISOString() }), `"${x.name}" is live again.`);
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const btn = 'px-3 py-1.5 rounded text-[11px] font-bold';
  const act = async (key, fn, ok) => { setBusy(key); setMsg(null); try { await fn(); if (ok) setMsg({ type: 'ok', text: ok }); } catch (e) { setMsg({ type: 'err', text: e.message }); } setBusy(''); };

  const pay = async (r) => {
    const a = await askInput(`Paid ${r.name || r.email}? Amount in taka (due: ${formatPrice(Math.max(0, r.due))})${r.payTo.length ? `\n${r.payTo.join('\n')}` : ''}`, { placeholder: 'e.g. 500', initial: r.due > 0 ? String(Math.round(r.due)) : '' });
    if (a === null || a === undefined || !(Number(a) > 0)) return;
    const note = await askInput('Note (optional, e.g. bKash TrxID):', { placeholder: 'e.g. TrxID 8N7...' });
    act(r.uid, () => addPayout(r.email, r.name || r.shop?.name || '', Number(a), note || '', { email: loggedInUserEmail }), 'Payment saved.');
  };
  const kill = async (r) => {
    const note = await askInput(`Page off: switch off "${r.shop ? r.shop.name : r.slug}"? Nothing is deleted. The seller cannot switch it on again; only you can, with Page on. Reason (the seller sees it):`, { placeholder: 'e.g. uses the Kyvro name' });
    if (note === null || note === undefined) return;
    act(r.uid, () => killSellerShop(r.slug, note), 'Page off: the shop is switched off.');
  };
  const remove = async (r) => {
    if (!(await askConfirm(`Remove the seller ${r.email} and all their shops now? Their orders stay. The account could open a new shop later.`, { danger: true, confirmText: 'Remove' }))) return;
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

  if (viewing) {
    return <SellerDashboard viewAs={{ ...viewing, onExit: () => setViewing(null) }} products={products} formatPrice={formatPrice} isDarkMode={isDarkMode} />;
  }
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

      {/* an approved seller asked for one more shop (Pro 2, Premium 3): it stays off until you approve it */}
      {(() => {
        const reqs = Object.values(shops).filter((x) => x.kind === 'seller' && x.extra && x.status === 'pending');
        if (!reqs.length) return null;
        return (
          <div className={`${card} border-[#D4AF37]/60`}>
            <h3 className="text-lg font-bold">New shop requests <span className="ml-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs align-middle">{reqs.length}</span></h3>
            <p className="text-xs text-gray-500">An approved seller asked for another shop. It stays off until you approve it. Reject removes it (and its link); the seller can ask again.</p>
            <div className="divide-y text-xs">
              {reqs.map((x) => {
                const owner = sellers.find((s) => s.uid === x.ownerUid) || null;
                const link = `${window.location.origin}/${x.handle || x.slug}`;
                return (
                  <div key={x.slug} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">{x.name} <span className="font-normal text-gray-500">· {owner ? `${owner.name || ''} (${owner.email || ''})` : 'Seller'}</span></p>
                      <p className="text-gray-500 break-all">{link}{Array.isArray(x.categories) && x.categories.length ? ` · ${x.categories.join(', ')}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={link} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded border border-gray-400 font-semibold">Open link</a>
                      <button type="button" disabled={!!busy} onClick={() => act(x.slug, () => acceptShop(x.slug), `"${x.name}" is live now.`)} className="px-3 py-1.5 rounded bg-green-600 text-white font-semibold disabled:opacity-50">Approve</button>
                      <button type="button" disabled={!!busy} onClick={async () => { if (!(await askConfirm(`Reject the shop "${x.name}"? It and its link are removed; the seller can ask again.`, { danger: true, confirmText: 'Reject' }))) return; act(x.slug, () => rejectSellerShop(owner, x.slug), `"${x.name}" was rejected.`); }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-semibold disabled:opacity-50">Reject</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {pending.length > 0 && (
        <div className={`${card} border-[#D4AF37]/60`}>
          <h3 className="text-lg font-bold">Pending applications <span className="ml-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs align-middle">{pending.length}</span></h3>
          <p className="text-xs text-gray-500">These shops are switched off until you approve them. Reject removes the shop; the person sees your note and can apply again.</p>
          <div className="divide-y text-xs">
            {pending.map((s) => {
              const row = (k, v, link) => (v ? <p><span className="text-gray-500">{k}:</span> {link ? <a href={v} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline break-all">{v}</a> : <span className="break-words">{v}</span>}</p> : null);
              return (
                <div key={s.uid} className="py-3 space-y-2">
                  <p className="font-bold text-sm flex flex-wrap items-center gap-2">{shops[s.slug] ? shops[s.slug].name : s.slug}
                    {chosenTier(s) !== 'free' && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${chosenTier(s) === 'premium' ? 'bg-black text-[#D4AF37] border border-[#D4AF37]' : 'bg-[#D4AF37] text-black'}`}>{chosenTier(s) === 'premium' ? 'Premium' : 'Pro'} · priority</span>}
                    <span className="font-normal text-xs text-gray-500">· applied {formatDateTime(s.createdAt)}</span></p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                    {row('Full name', s.name)}
                    {row('Email', s.email)}
                    {row('WhatsApp', s.whatsapp)}
                    {row('District / area', [s.district, s.area].filter(Boolean).join(', '))}
                    {row('Address', s.address)}
                    {s.pageLink && row('Page', s.pageLink, true)}
                    {['facebook', 'instagram', 'tiktok'].map((k) => (s.socialLinks && s.socialLinks[k] ? <React.Fragment key={k}>{row(k === 'tiktok' ? 'TikTok' : k[0].toUpperCase() + k.slice(1), s.socialLinks[k], true)}</React.Fragment> : null))}
                    <div className="sm:col-span-2">{row('Categories', Array.isArray(s.categories) && s.categories.length ? s.categories.join(', ') : '')}</div>
                    {Array.isArray(s.subCategories) && s.subCategories.length > 0 && <div className="sm:col-span-2">{row('Sub-categories', s.subCategories.join(', '))}</div>}
                    <div className="sm:col-span-2">{row('Note', s.productNote)}</div>
                    {row('Independent seller confirmed', s.agreed ? 'Yes' : 'No')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`${window.location.origin}/${(shops[s.slug] && shops[s.slug].handle) || s.slug}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-gray-400`}>Open link</a>
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
                      <p className="font-bold">{r.shop ? r.shop.name : r.slug}
                        {r.tier !== 'free' && <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase align-middle ${r.tier === 'premium' ? 'bg-black text-[#D4AF37] border border-[#D4AF37]' : 'bg-[#D4AF37] text-black'}`}>{r.tier === 'premium' ? 'Premium' : 'Pro'}</span>}
                        {r.feat.weeklyPayout && <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase align-middle bg-green-600 text-white">Weekly payout</span>}
                        <span className="font-normal text-gray-500"> · {r.name || ''} {r.email}</span></p>
                      <p className="text-gray-500 break-all">{window.location.origin}/{(r.shop && r.shop.handle) || r.slug} · {r.shop ? Object.keys(r.shop.items || {}).length : 0} products · {seenText(r)}{r.shopCount > 1 ? `${r.shopCount} shops · ` : ''}{r.orders} order(s) · {r.until > Date.now() ? `${r.tier === 'premium' ? 'Premium' : 'Pro'} until ${new Date(r.until).toLocaleDateString('en-GB')}` : 'Free plan'}</p>
                      {r.payTo.length
                        ? <div className="text-gray-500">{r.payTo.map((l) => <p key={l} className="break-all">{l}</p>)}</div>
                        : <p className="text-gray-500">Payout: not given yet</p>}
                      {r.shop && r.shop.killed && <p className="text-red-500 font-semibold">Switched off by you{r.shop.killNote ? `: ${r.shop.killNote}` : ''}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${on ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>{on ? 'LIVE' : 'OFF'}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Earned <strong className="text-[#D4AF37]">{formatPrice(r.earned)}</strong> · Paid <strong className="text-green-600">{formatPrice(r.paid)}</strong> · {r.due >= 0 ? 'Due' : 'Overpaid'} <strong className={r.due > 0 ? 'text-red-500' : 'text-green-600'}>{formatPrice(Math.abs(r.due))}</strong></span>
                    <div className="flex flex-wrap gap-2">
                      <a href={`${window.location.origin}/${(r.shop && r.shop.handle) || r.slug}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-gray-400`}>Open link</a>
                      <button type="button" onClick={() => { setViewing({ uid: r.uid, email: r.email || '', name: r.name || '' }); try { window.scrollTo({ top: 0 }); } catch (e) { /* old browser */ } }} className={`${btn} border border-[#D4AF37] text-[#B8921F]`}>View dashboard</button>
                      <button type="button" disabled={busy === r.uid} onClick={() => pay(r)} className={`${btn} bg-green-600 text-white disabled:opacity-50`}>Mark as paid</button>
                      {r.shop && (r.shop.killed
                        ? <button type="button" disabled={busy === r.uid} onClick={() => act(r.uid, () => reviveSellerShop(r.slug), 'Page on: the shop is live again.')} className={`${btn} border border-green-600 text-green-600 disabled:opacity-50`}>Page on</button>
                        : <button type="button" disabled={busy === r.uid} onClick={() => kill(r)} className={`${btn} bg-red-600 text-white disabled:opacity-50`}>Page off</button>)}
                      <button type="button" disabled={busy === r.uid} onClick={() => remove(r)} className={`${btn} border border-red-500 text-red-500 disabled:opacity-50`}>Remove</button>
                    </div>
                  </div>
                  {/* every shop of this seller: warn first (with a note), then remove if needed */}
                  <div className={`rounded border divide-y divide-gray-500/15 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    {sellerShopList(r).map((slug) => shops[slug]).filter(Boolean).map((x) => {
                      const first = x.slug === r.slug;
                      const state = x.status === 'pending' ? 'WAITING' : x.inactiveHold ? 'HIDDEN (inactive)' : x.killed ? 'KILLED' : x.active === false ? 'OFF' : 'LIVE';
                      return (
                        <div key={x.slug} className="p-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{x.name}{first ? '' : ' (extra shop)'} <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${state === 'LIVE' ? 'bg-green-600 text-white' : 'bg-amber-500 text-black'}`}>{state}</span></p>
                            <p className="text-gray-500 break-all">{window.location.origin}/{x.handle || x.slug}</p>
                            {x.warning && x.warning.note && <p className="text-amber-600">Warned {String(x.warning.at || '').slice(0, 10)}: {x.warning.note}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={!!busy} onClick={() => warnShop(x)} className={`${btn} border border-amber-500 text-amber-600 disabled:opacity-50`}>Warning</button>
                            {x.inactiveHold && <button type="button" disabled={!!busy} onClick={() => unholdShop(x)} className={`${btn} border border-green-600 text-green-600 disabled:opacity-50`}>Make live</button>}
                            <button type="button" disabled={!!busy} onClick={async () => {
                              if (first) { remove(r); return; }
                              if (!(await askConfirm(`Remove the shop "${x.name}" now? Its link stops working; orders stay.`, { danger: true, confirmText: 'Remove' }))) return;
                              act(x.slug, () => rejectSellerShop(r, x.slug), `"${x.name}" was removed.`);
                            }} className={`${btn} border border-red-500 text-red-500 disabled:opacity-50`}>{first ? 'Remove (all)' : 'Remove'}</button>
                          </div>
                        </div>
                      );
                    })}
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
