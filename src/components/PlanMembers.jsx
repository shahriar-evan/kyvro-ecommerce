import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { auth } from '../firebase';
import { askConfirm, askInput } from './AlertCenter';
import { watchAllShops, watchShopOwners, setShopFeatures, grantLogo, denyLogoRequest, approveLogo, rejectLogo, setShopOn, approveBanner, rejectBanner, removeShopSoft, restoreShop, purgeShopNow } from '../shops';
import { watchSellers, reviveSellerShop } from '../sellers';
import { watchOrders } from '../orders';
import { watchPayouts } from '../payouts';
import { effectiveTier, toMillis, TIER_LABEL, normalizePlans, orderMarkup } from '../data/priceCheck';
import { watchPlans } from '../storeSettings';
import { FEATURES, featureDefault, featureLockedFree } from '../data/shopBrand';

// Plan Members (Owner and Managers): every shop with its plan, and per feature Default / ON / OFF.
// Owner only: a plan by hand (comp), the seller's private details and the kill switch. A Manager can switch features,
// decide logos and switch shops on or off, but not on their own shop (the rules check all of this too).
// title / hideUid: the Owner's Team Shops page uses this list for every shop, without the Owner's own shop (that one is
// on Admin -> My Shop). kind filter: all shops / team shops / seller shops.
export default function PlanMembers({ isOwner, isDarkMode, title = 'Plan Members', hideUid = '' }) {
  const [shops, setShops] = useState([]);
  const [owners, setOwners] = useState({});
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [kind, setKind] = useState('all');
  const [copied, setCopied] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [comp, setComp] = useState({ tier: 'pro', days: '30' });
  const me = auth.currentUser ? auth.currentUser.uid : '';

  useEffect(() => watchAllShops(setShops, () => {}), []);
  // the Owner's per-plan feature switches (Shop plans)
  const [plans, setPlans] = useState(() => normalizePlans(null));
  useEffect(() => watchPlans(setPlans), []);
  useEffect(() => watchShopOwners(setOwners, () => {}), []);
  useEffect(() => (isOwner ? watchSellers(setSellers, () => {}) : undefined), [isOwner]);
  // Owner: orders + payouts, for the checks before removing a shop (money still due, open orders)
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  useEffect(() => (isOwner ? watchOrders(setOrders, () => {}) : undefined), [isOwner]);
  useEffect(() => (isOwner ? watchPayouts(true, '', setPayouts, () => {}) : undefined), [isOwner]);
  // before removing: is the owner still active (signed in within 7 days), did customers open the shop within 15 days,
  // is any markup still unpaid, any open orders? Warnings only; the Owner still decides.
  const removalCheck = (r) => {
    const day = 86400000;
    const ago = (ms) => (ms ? Math.floor((Date.now() - ms) / day) : null);
    const seller = r.kind === 'seller' ? sellers.find((x) => x.uid === r.ownerUid) : null;
    const email = String(seller ? seller.email : (owners[r.slug] || {}).email || '').toLowerCase();
    const slugs = new Set(r.kind === 'seller' ? shops.filter((x) => x.ownerUid === r.ownerUid).map((x) => x.slug) : [r.slug]);
    const mine = orders.filter((o) => slugs.has(o.shop));
    const earned = mine.filter((o) => o.status === 'Delivered' && !o.returned).reduce((n, o) => n + orderMarkup(o), 0);
    const paid = email ? payouts.filter((p) => String(p.email || '').toLowerCase() === email).reduce((n, p) => n + (Number(p.amount) || 0), 0) : 0;
    const due = Math.round(earned - paid);
    const open = mine.filter((o) => o.shop === r.slug && !['Delivered', 'Cancelled'].includes(o.status)).length;
    const seen = ago(toMillis(seller && seller.lastSeenAt));
    const visit = ago(toMillis(r.lastVisitAt));
    const warn = [];
    if (seen !== null && seen <= 7) warn.push(`Active: the owner signed in ${seen === 0 ? 'today' : `${seen} day${seen === 1 ? '' : 's'} ago`}.`);
    if (visit !== null && visit <= 15) warn.push(`Customers opened this shop ${visit === 0 ? 'today' : `${visit} day${visit === 1 ? '' : 's'} ago`}.`);
    if (due > 0) warn.push(`Markup not paid yet: ৳${due}. Pay it first (Sellers / Team Stats); after removal it is no longer listed there.`);
    if (open > 0) warn.push(`${open} open order${open === 1 ? '' : 's'} (not delivered or cancelled yet).`);
    return { warn, seen, visit, due, open };
  };

  const rows = useMemo(() => shops.map((s) => {
    const seller = s.kind === 'seller' ? sellers.find((x) => x.slug === s.slug) : null;
    const team = owners[s.slug];
    const member = seller ? (seller.name || seller.email) : team ? (team.name || team.email) : (s.kind === 'seller' ? 'Seller' : '');
    const tier = s.planExempt ? 'owner' : effectiveTier(s);
    const until = toMillis(s.paidUntil);
    return { ...s, seller, member, tier, until, expired: !!until && until <= Date.now() };
  }), [shops, sellers, owners]);

  const visibleRows = rows.filter((r) => !(hideUid && r.ownerUid === hideUid));
  // removed shops wait 30 days in their own list (restore or delete now); the main list leaves them out
  const removedRows = visibleRows.filter((r) => r.removed && r.removed.at).sort((a, b) => String(b.removed.at).localeCompare(String(a.removed.at)));
  const listed = visibleRows.filter((r) => !(r.removed && r.removed.at));
  const counts = { all: listed.length, team: listed.filter((r) => r.kind !== 'seller').length, seller: listed.filter((r) => r.kind === 'seller').length };
  const shown = listed.filter((r) => {
    if (kind === 'team' && r.kind === 'seller') return false;
    if (kind === 'seller' && r.kind !== 'seller') return false;
    if (filter === 'Free' && r.tier !== 'free') return false;
    if (filter === 'Pro' && r.tier !== 'pro') return false;
    if (filter === 'Premium' && r.tier !== 'premium') return false;
    if (filter === 'Expired' && !r.expired) return false;
    const t = q.trim().toLowerCase();
    return !t || [r.name, r.member, r.slug].some((v) => String(v || '').toLowerCase().includes(t));
  }).sort((a, b) => ((b.logoPending || b.bannerPending ? 2 : 0) + (b.logoRequest ? 1 : 0)) - ((a.logoPending || a.bannerPending ? 2 : 0) + (a.logoRequest ? 1 : 0)) || String(a.name).localeCompare(String(b.name)));

  const cur = rows.find((r) => r.slug === open) || null;
  useEffect(() => { if (cur) setDraft({ ...(cur.features || {}) }); setMsg(null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;
  const tierBadge = (t) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t === 'premium' ? 'bg-black text-[#D4AF37] border border-[#D4AF37]' : t === 'pro' ? 'bg-[#D4AF37] text-black' : t === 'owner' ? 'bg-gray-700 text-white' : 'bg-gray-400/30 text-gray-500'}`}>{t === 'owner' ? 'Owner' : TIER_LABEL[t]}</span>
  );
  const act = async (fn, ok) => { setBusy(true); setMsg(null); try { await fn(); if (ok) setMsg({ type: 'ok', text: ok }); } catch (e) { setMsg({ type: 'err', text: e.code === 'permission-denied' ? 'Not allowed (or publish the latest Firestore rules).' : e.message }); } setBusy(false); };
  const ownShop = cur && cur.ownerUid === me && !isOwner;

  const giveComp = async (end) => {
    if (!cur) return;
    const label = end ? 'End this plan now?' : `Give ${TIER_LABEL[comp.tier]} for ${comp.days} days to ${cur.member || cur.name}?`;
    if (!(await askConfirm(label))) return;
    act(async () => {
      const t = await auth.currentUser.getIdToken();
      const r = await fetch('/api/plan?action=comp', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(end ? { uid: cur.ownerUid, end: true } : { uid: cur.ownerUid, tier: comp.tier, days: comp.days }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not save the plan.');
    }, end ? 'Plan ended.' : 'Plan given.');
  };

  return (
    <div className="space-y-5">
      <div className={card}>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">Every shop (team and sellers) with its plan{hideUid ? ' (your own shop is under My Shop)' : ''}. Open one to see its link, switch features ON or OFF, decide its logo / banner or switch the shop on or off.{isOwner ? ' Only you can give a plan by hand, see sellers’ details and remove a shop.' : ''}</p>
        </div>
        {/* team shops and seller shops apart */}
        <div className={`inline-flex rounded-lg border p-0.5 text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          {[['all', 'All shops'], ['team', 'Team'], ['seller', 'Sellers']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-md ${kind === k ? 'bg-black text-[#D4AF37]' : 'text-gray-500'}`}>{l} ({counts[k]})</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Free', 'Pro', 'Premium', 'Expired'].map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${filter === f ? 'bg-[#D4AF37] text-black' : isDarkMode ? 'bg-[#222] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{f === 'Free' ? 'Basic' : f}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop or name" className={`${inputCls} flex-1 min-w-[10rem]`} />
        </div>
        {shown.length === 0 ? <p className="text-sm text-gray-500">No shops.</p> : (
          <div className="divide-y text-xs">
            {shown.map((r) => (
              <button key={r.slug} type="button" onClick={() => setOpen(open === r.slug ? '' : r.slug)} aria-expanded={open === r.slug} title="Open details" className={`group w-full text-left py-3 px-2 -mx-2 rounded flex flex-wrap items-center justify-between gap-2 transition ${open === r.slug ? 'bg-[#D4AF37]/5' : 'hover:bg-gray-500/5'}`}>
                <span className="min-w-0">
                  <span className="font-bold">{r.name || r.slug}</span> <span className="text-gray-500">· {r.member || '-'}{r.kind === 'seller' ? ' (seller)' : ''}</span>
                  {r.logoPending && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">Logo to approve</span>}
                  {r.bannerPending && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">Banner to approve</span>}
                  {r.logoRequest && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">Logo request</span>}
                </span>
                <span className="flex items-center gap-2">
                  {tierBadge(r.tier)}
                  <span className="text-gray-500">{r.until ? (r.expired ? `expired ${new Date(r.until).toLocaleDateString('en-GB')}` : `until ${new Date(r.until).toLocaleDateString('en-GB')}`) : ''}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.active === false ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'}`}>{r.killed ? 'KILLED' : r.status === 'pending' ? 'PENDING' : r.active === false ? 'OFF' : 'ON'}</span>
                  {/* arrow: the row opens the shop's details below */}
                  <ChevronRight size={16} aria-hidden="true" className={`shrink-0 text-gray-400 group-hover:text-[#B8921F] transition-transform ${open === r.slug ? 'rotate-90 text-[#B8921F]' : ''}`} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Owner: removed shops, kept 30 days (then the daily job deletes them); the shop owner can ask on WhatsApp */}
      {isOwner && removedRows.length > 0 && (
        <div className={card}>
          <div>
            <h3 className="text-lg font-bold">Removed shops <span className="text-sm font-normal text-gray-500">({removedRows.length})</span></h3>
            <p className="text-xs text-gray-500 mt-1">Hidden from customers. Each is deleted for good 30 days after removal. Restore one if its owner asks (WhatsApp). Orders are not affected.</p>
          </div>
          {msg && !cur && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
          <div className="divide-y text-xs">
            {removedRows.map((r) => {
              const left = Math.max(0, 30 - Math.floor((Date.now() - Date.parse(r.removed.at)) / 86400000));
              return (
                <div key={r.slug} className="py-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{r.name || r.slug} <span className="font-normal text-gray-500">· {r.member || '-'}{r.kind === 'seller' ? ' (seller)' : ''} · kyvro.store/{r.handle || r.slug}</span></p>
                    <p className="text-gray-500">Removed {new Date(r.removed.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · <strong className={left <= 5 ? 'text-red-500' : ''}>{left} day{left === 1 ? '' : 's'} left</strong></p>
                    {r.removed.note && <p className="mt-1 px-2 py-1 rounded bg-gray-500/10">Reason: {r.removed.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={async () => { if (!(await askConfirm(`Restore "${r.name || r.slug}"? It goes live again with its link.`, { confirmText: 'Restore' }))) return; act(() => restoreShop(r.slug), `"${r.name || r.slug}" is live again.`); }} className="px-3 py-1.5 rounded border border-green-600 text-green-600 font-bold disabled:opacity-50">Restore</button>
                    <button type="button" disabled={busy} onClick={async () => { if (!(await askConfirm(`Delete "${r.name || r.slug}" for good now? Its link is freed and it cannot be restored. Orders stay.`, { danger: true, confirmText: 'Delete now' }))) return; act(() => purgeShopNow(r.slug), 'Deleted for good.'); }} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-bold disabled:opacity-50">Delete now</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cur && (
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold">{cur.name} {tierBadge(cur.tier)}</h3>
              <p className="text-xs text-gray-500 break-all">{window.location.origin}/{cur.handle || cur.slug} · {Object.keys(cur.items || {}).length} products</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`${window.location.origin}/${cur.handle || cur.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">Open link</a>
                <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/${cur.handle || cur.slug}`); setCopied(cur.slug); setTimeout(() => setCopied(''), 1500); } catch (e) { /* old browser */ } }} className="px-3 py-1.5 rounded border border-gray-400 text-xs font-semibold">{copied === cur.slug ? 'Copied' : 'Copy link'}</button>
              </div>
            </div>
            <button type="button" onClick={() => setOpen('')} className="text-xs underline text-gray-500">Close</button>
          </div>
          {ownShop && <p className="text-xs text-amber-600">This is your own shop: a Manager cannot change its features.</p>}
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

          {/* features */}
          <div className="divide-y text-xs">
            {FEATURES.map((f) => {
              const base = cur.tier === 'owner' ? true : featureDefault(f.key, cur.tier, plans.tierFeatures);
              // shop name / logo / banner: never on the Free plan (also in firestore.rules)
              const locked = cur.tier !== 'owner' && featureLockedFree(f.key, cur.tier);
              const v = typeof draft[f.key] === 'boolean' ? (draft[f.key] ? 'on' : 'off') : 'default';
              const eff = locked ? false : typeof draft[f.key] === 'boolean' ? draft[f.key] : base;
              return (
                <div key={f.key} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{f.label}</strong> <span className={eff ? 'text-green-600' : 'text-gray-500'}>· {eff ? 'on' : 'off'}</span>{locked && <span className="text-gray-500"> (Pro / Premium only)</span>}</span>
                  <span className="inline-flex rounded border overflow-hidden">
                    {[['default', `Default (${base ? 'on' : 'off'})`], ['on', 'ON'], ['off', 'OFF']].map(([k, l]) => (
                      <button key={k} type="button" disabled={ownShop || busy || locked} onClick={() => setDraft((d) => { const n = { ...d }; if (k === 'default') delete n[f.key]; else n[f.key] = k === 'on'; return n; })}
                        className={`px-2.5 py-1 text-[11px] font-semibold ${v === k ? 'bg-[#D4AF37] text-black' : ''} disabled:opacity-50`}>{l}</button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          <button type="button" disabled={ownShop || busy || JSON.stringify(draft) === JSON.stringify(cur.features || {})} onClick={() => act(() => setShopFeatures(cur.slug, draft), 'Features saved.')} className="bg-[#D4AF37] text-black font-bold px-5 py-2 rounded text-xs uppercase tracking-wider disabled:opacity-40">Save features</button>

          {/* logo */}
          {(cur.logo || cur.logoPending || cur.logoRequest) && (
            <div className={`rounded border p-3 space-y-2 text-xs ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <p className="font-bold uppercase tracking-wider">Logo</p>
              {cur.logoRequest && (
                <div className="flex flex-wrap items-center gap-2">
                  <span>Asks for logo permission.</span>
                  <button type="button" disabled={ownShop || busy} onClick={() => act(() => grantLogo(cur.slug, cur.features), 'Logo upload switched on.')} className="px-3 py-1 rounded bg-green-600 text-white font-bold disabled:opacity-50">Grant</button>
                  <button type="button" disabled={ownShop || busy} onClick={async () => { const n = await askInput('Reason (optional):'); if (n === null || n === undefined) return; act(() => denyLogoRequest(cur.slug, n), 'Request rejected.'); }} className="px-3 py-1 rounded border border-red-500 text-red-500 font-bold disabled:opacity-50">Reject</button>
                </div>
              )}
              {cur.logoPending && (
                <div className="flex flex-wrap items-center gap-3">
                  <img src={cur.logoPending} alt="" className="w-16 h-16 rounded object-cover border" />
                  <button type="button" disabled={ownShop || busy} onClick={() => act(() => approveLogo(cur), 'Logo approved.')} className="px-3 py-1 rounded bg-green-600 text-white font-bold disabled:opacity-50">Approve</button>
                  <button type="button" disabled={ownShop || busy} onClick={async () => { const n = await askInput('Why is the logo rejected? (the shop sees it)'); if (n === null || n === undefined) return; act(() => rejectLogo(cur.slug, n), 'Logo rejected.'); }} className="px-3 py-1 rounded border border-red-500 text-red-500 font-bold disabled:opacity-50">Reject</button>
                </div>
              )}
              {cur.logo && <div className="flex items-center gap-3"><img src={cur.logo} alt="" className="w-10 h-10 rounded object-cover border" /><span className="text-green-600">Approved logo</span></div>}
            </div>
          )}

          {/* banner */}
          {(cur.banner || cur.bannerPending) && (
            <div className={`rounded border p-3 space-y-2 text-xs ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <p className="font-bold uppercase tracking-wider">Banner</p>
              {cur.bannerPending && (
                <div className="space-y-2">
                  <img src={cur.bannerPending} alt="" className="w-full max-h-40 object-cover rounded border" />
                  <div className="flex gap-2">
                    <button type="button" disabled={ownShop || busy} onClick={() => act(() => approveBanner(cur), 'Banner approved.')} className="px-3 py-1 rounded bg-green-600 text-white font-bold disabled:opacity-50">Approve</button>
                    <button type="button" disabled={ownShop || busy} onClick={async () => { const n = await askInput('Why is the banner rejected? (the shop sees it)'); if (n === null || n === undefined) return; act(() => rejectBanner(cur.slug, n), 'Banner rejected.'); }} className="px-3 py-1 rounded border border-red-500 text-red-500 font-bold disabled:opacity-50">Reject</button>
                  </div>
                </div>
              )}
              {cur.banner && <div className="space-y-1"><img src={cur.banner} alt="" className="w-full max-h-24 object-cover rounded border" /><span className="text-green-600">Approved banner</span></div>}
            </div>
          )}

          {/* shop on / off (a Manager cannot switch on a killed or waiting shop) */}
          {!cur.killed && cur.status !== 'pending' && cur.tier !== 'owner' && (
            <button type="button" disabled={ownShop || busy} onClick={() => act(() => setShopOn(cur.slug, cur.active === false), cur.active === false ? 'Shop is ON.' : 'Shop is OFF.')} className={`px-4 py-2 rounded text-xs font-bold ${cur.active === false ? 'bg-green-600 text-white' : 'border border-gray-400'} disabled:opacity-50`}>{cur.active === false ? 'Switch shop ON' : 'Switch shop OFF'}</button>
          )}

          {/* Owner only */}
          {isOwner && cur.tier !== 'owner' && (
            <div className={`rounded border p-3 space-y-3 text-xs ${isDarkMode ? 'border-[#D4AF37]/30' : 'border-[#D4AF37]/40'}`}>
              <p className="font-bold uppercase tracking-wider text-[#D4AF37]">Owner only</p>
              <div className="flex flex-wrap items-center gap-2">
                <span>Give a plan:</span>
                <select value={comp.tier} onChange={(e) => setComp((c) => ({ ...c, tier: e.target.value }))} className={inputCls}><option value="pro">Pro</option><option value="premium">Premium</option></select>
                <input type="number" min="1" max="366" value={comp.days} onChange={(e) => setComp((c) => ({ ...c, days: e.target.value }))} className={`${inputCls} w-20`} /> days
                <button type="button" disabled={busy} onClick={() => giveComp(false)} className="px-3 py-1.5 rounded bg-[#D4AF37] text-black font-bold disabled:opacity-50">Give</button>
                {cur.until > Date.now() && <button type="button" disabled={busy} onClick={() => giveComp(true)} className="px-3 py-1.5 rounded border border-red-500 text-red-500 font-bold disabled:opacity-50">End plan now</button>}
              </div>
              {cur.seller && (
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  <p><span className="text-gray-500">Email:</span> {cur.seller.email}</p>
                  <p><span className="text-gray-500">WhatsApp:</span> {cur.seller.whatsapp || '-'}</p>
                  <p><span className="text-gray-500">District / area:</span> {[cur.seller.district, cur.seller.area].filter(Boolean).join(', ') || '-'}</p>
                  <p><span className="text-gray-500">Address:</span> {cur.seller.address || '-'}</p>
                </div>
              )}
              {/* removal check: the same facts the Remove dialog warns about */}
              {(() => {
                const chk = removalCheck(cur);
                const fmt = (d) => (d === null ? 'never' : d === 0 ? 'today' : `${d} day${d === 1 ? '' : 's'} ago`);
                return (
                  <div className={`rounded border p-2.5 space-y-1 ${chk.warn.length ? 'border-amber-500/50 bg-amber-500/10' : 'border-green-600/40 bg-green-600/5'}`}>
                    <p className="font-bold">{chk.warn.length ? '⚠ Before removing' : '✓ OK to remove'}</p>
                    <p className="text-gray-500">Owner signed in: {cur.kind === 'seller' ? fmt(chk.seen) : 'team member'} · Last customer visit: {fmt(chk.visit)} · Markup due: ৳{Math.max(0, chk.due)} · Open orders: {chk.open}</p>
                    {chk.warn.map((w) => <p key={w} className="text-amber-700">• {w}</p>)}
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2">
                {cur.kind === 'seller' && cur.killed && <button type="button" disabled={busy} onClick={() => act(() => reviveSellerShop(cur.slug), 'Shop revived.')} className="px-3 py-1.5 rounded border border-green-600 text-green-600 font-bold disabled:opacity-50">Revive</button>}
                {/* remove: hidden at once and kept 30 days in "Removed shops" (restore from there); the reason is emailed */}
                <button type="button" disabled={busy} onClick={async () => {
                  const chk = removalCheck(cur);
                  const head = chk.warn.length
                    ? `⚠ Check before removing "${cur.name || cur.slug}":\n• ${chk.warn.join('\n• ')}\n\n`
                    : `✓ OK to remove "${cur.name || cur.slug}": the owner has not signed in for 7+ days, no customer opened it in 15 days, nothing is due and no order is open.\n\n`;
                  const note = await askInput(`${head}It is hidden at once and kept for 30 days under Removed shops (you can restore it there), then deleted. Reason (the shop owner gets it by email):`, { placeholder: 'e.g. used a big brand name' });
                  if (note === null || note === undefined) return;
                  if (String(note).trim().length < 3) { setMsg({ type: 'err', text: 'Write the reason (at least 3 letters).' }); return; }
                  act(async () => { await removeShopSoft(cur.slug, String(note).trim()); setOpen(''); }, 'Shop removed. It stays 30 days under Removed shops.');
                }} className="px-3 py-1.5 rounded bg-red-600 text-white font-bold disabled:opacity-50">Remove shop</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
