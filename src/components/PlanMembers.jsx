import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { askConfirm, askInput } from './AlertCenter';
import { watchAllShops, watchShopOwners, setShopFeatures, grantLogo, denyLogoRequest, approveLogo, rejectLogo, setShopOn } from '../shops';
import { watchSellers, killSellerShop, reviveSellerShop } from '../sellers';
import { effectiveTier, toMillis, TIER_LABEL } from '../data/priceCheck';
import { FEATURES, featureDefault } from '../data/shopBrand';

// Plan Members (Owner and Managers): every shop with its plan, and per feature Default / ON / OFF.
// Owner only: a plan by hand (comp), the seller's private details and the kill switch. A Manager can switch features,
// decide logos and switch shops on or off, but not on their own shop (the rules check all of this too).
export default function PlanMembers({ isOwner, isDarkMode }) {
  const [shops, setShops] = useState([]);
  const [owners, setOwners] = useState({});
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [comp, setComp] = useState({ tier: 'pro', days: '30' });
  const me = auth.currentUser ? auth.currentUser.uid : '';

  useEffect(() => watchAllShops(setShops, () => {}), []);
  useEffect(() => watchShopOwners(setOwners, () => {}), []);
  useEffect(() => (isOwner ? watchSellers(setSellers, () => {}) : undefined), [isOwner]);

  const rows = useMemo(() => shops.map((s) => {
    const seller = s.kind === 'seller' ? sellers.find((x) => x.slug === s.slug) : null;
    const team = owners[s.slug];
    const member = seller ? (seller.name || seller.email) : team ? (team.name || team.email) : (s.kind === 'seller' ? 'Seller' : '');
    const tier = s.planExempt ? 'owner' : effectiveTier(s);
    const until = toMillis(s.paidUntil);
    return { ...s, seller, member, tier, until, expired: !!until && until <= Date.now() };
  }), [shops, sellers, owners]);

  const shown = rows.filter((r) => {
    if (filter === 'Free' && r.tier !== 'free') return false;
    if (filter === 'Pro' && r.tier !== 'pro') return false;
    if (filter === 'Premium' && r.tier !== 'premium') return false;
    if (filter === 'Expired' && !r.expired) return false;
    const t = q.trim().toLowerCase();
    return !t || [r.name, r.member, r.slug].some((v) => String(v || '').toLowerCase().includes(t));
  }).sort((a, b) => ((b.logoPending ? 2 : 0) + (b.logoRequest ? 1 : 0)) - ((a.logoPending ? 2 : 0) + (a.logoRequest ? 1 : 0)) || String(a.name).localeCompare(String(b.name)));

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
          <h3 className="text-lg font-bold">Plan Members</h3>
          <p className="text-xs text-gray-500 mt-1">Every shop (sellers and team) with its plan. Open one to switch features ON or OFF, decide its logo or switch the shop on or off.{isOwner ? ' Only you can give a plan by hand, see sellers’ details and use the kill switch.' : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Free', 'Pro', 'Premium', 'Expired'].map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider ${filter === f ? 'bg-[#D4AF37] text-black' : isDarkMode ? 'bg-[#222] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{f}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop or name" className={`${inputCls} flex-1 min-w-[10rem]`} />
        </div>
        {shown.length === 0 ? <p className="text-sm text-gray-500">No shops.</p> : (
          <div className="divide-y text-xs">
            {shown.map((r) => (
              <button key={r.slug} type="button" onClick={() => setOpen(open === r.slug ? '' : r.slug)} className={`w-full text-left py-3 flex flex-wrap items-center justify-between gap-2 ${open === r.slug ? 'bg-[#D4AF37]/5' : ''}`}>
                <span className="min-w-0">
                  <span className="font-bold">{r.name || r.slug}</span> <span className="text-gray-500">· {r.member || '-'}{r.kind === 'seller' ? ' (seller)' : ''}</span>
                  {r.logoPending && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">Logo to approve</span>}
                  {r.logoRequest && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">Logo request</span>}
                </span>
                <span className="flex items-center gap-2">
                  {tierBadge(r.tier)}
                  <span className="text-gray-500">{r.until ? (r.expired ? `expired ${new Date(r.until).toLocaleDateString('en-GB')}` : `until ${new Date(r.until).toLocaleDateString('en-GB')}`) : ''}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.active === false ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'}`}>{r.killed ? 'KILLED' : r.status === 'pending' ? 'PENDING' : r.active === false ? 'OFF' : 'ON'}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {cur && (
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold">{cur.name} {tierBadge(cur.tier)}</h3>
              <p className="text-xs text-gray-500 break-all">{window.location.origin}/?shop={cur.slug} · {Object.keys(cur.items || {}).length} products</p>
            </div>
            <button type="button" onClick={() => setOpen('')} className="text-xs underline text-gray-500">Close</button>
          </div>
          {ownShop && <p className="text-xs text-amber-600">This is your own shop: a Manager cannot change its features.</p>}
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

          {/* features */}
          <div className="divide-y text-xs">
            {FEATURES.map((f) => {
              const base = cur.tier === 'owner' ? true : featureDefault(f.key, cur.tier);
              const v = typeof draft[f.key] === 'boolean' ? (draft[f.key] ? 'on' : 'off') : 'default';
              const eff = typeof draft[f.key] === 'boolean' ? draft[f.key] : base;
              return (
                <div key={f.key} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{f.label}</strong> <span className={eff ? 'text-green-600' : 'text-gray-500'}>· {eff ? 'on' : 'off'}</span></span>
                  <span className="inline-flex rounded border overflow-hidden">
                    {[['default', `Default (${base ? 'on' : 'off'})`], ['on', 'ON'], ['off', 'OFF']].map(([k, l]) => (
                      <button key={k} type="button" disabled={ownShop || busy} onClick={() => setDraft((d) => { const n = { ...d }; if (k === 'default') delete n[f.key]; else n[f.key] = k === 'on'; return n; })}
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
              {cur.kind === 'seller' && (cur.killed
                ? <button type="button" disabled={busy} onClick={() => act(() => reviveSellerShop(cur.slug), 'Shop revived.')} className="px-3 py-1.5 rounded border border-green-600 text-green-600 font-bold disabled:opacity-50">Revive</button>
                : <button type="button" disabled={busy} onClick={async () => { const n = await askInput('Kill switch: reason (the seller sees it):'); if (n === null || n === undefined) return; act(() => killSellerShop(cur.slug, n), 'Shop switched off for good.'); }} className="px-3 py-1.5 rounded bg-red-600 text-white font-bold disabled:opacity-50">Kill switch</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
