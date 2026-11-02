import React, { useEffect, useMemo, useState } from 'react';
import { askConfirm } from './AlertCenter';
import { loadStatsResets, resetAdminStats, listAdmins } from '../adminAuth';
import { toDate, formatDateTime } from '../utils/dates';

// Team performance: who confirmed / delivered / cancelled how many orders, and which products and how much money that was.
// Everything is read from the orders themselves (confirmedBy + the status history), so old orders count too.
// The Owner sees every team member; everybody else sees only their own numbers.

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];
const rangeFor = (id, from, to) => {
  const now = new Date();
  if (id === 'today') return [startOfDay(now), null];
  if (id === 'week') { const s = startOfDay(now); s.setDate(s.getDate() - ((s.getDay() + 1) % 7)); return [s, null]; } // week starts on Saturday
  if (id === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), null];
  if (id === 'custom') return [from ? new Date(`${from}T00:00:00`) : null, to ? new Date(`${to}T23:59:59.999`) : null];
  return [null, null];
};

const lastEntry = (o, status) => {
  const h = Array.isArray(o.history) ? o.history : [];
  for (let i = h.length - 1; i >= 0; i--) if (h[i] && h[i].status === status) return h[i];
  return null;
};
const keyOf = (email, name) => String(email || name || '').trim().toLowerCase();

export default function TeamStats({ productCosts = {}, productCommissions = {}, shopOwners = {}, adminRole = '', showProfit = true, products = [], startEditProduct, canEditProduct, orders, isDarkMode, formatPrice, isOwner, loggedInUserEmail, adminName }) {
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState('');
  const me = keyOf(loggedInUserEmail, adminName);
  // when the Owner reset a person's numbers (counting starts again from that moment)
  const [resets, setResets] = useState({});
  useEffect(() => { loadStatsResets(isOwner, loggedInUserEmail).then(setResets); }, [isOwner, loggedInUserEmail]);
  // a shop's markup on one order = (price the customer paid - store price) x pieces
  const markupOf = (o) => (o.items || []).reduce((n, it) => n + Math.max(0, (Number(it.price) || 0) - (it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it.price) || 0)) * (parseInt(it.quantity, 10) || 0), 0);
  const myShopSlugs = Object.entries(shopOwners).filter(([, o]) => String(o.email || '').toLowerCase() === String(loggedInUserEmail || '').toLowerCase()).map(([k]) => k);
  // Managers earn the shop markup, Admins earn commission: the Owner's view needs everybody's role
  const [roles, setRoles] = useState({});
  useEffect(() => {
    if (!isOwner) return;
    listAdmins().then((l) => { const m = {}; l.forEach((a) => { m[String(a.email).toLowerCase()] = a.role; }); setRoles(m); }).catch(() => {});
  }, [isOwner]);
  const anyCommission = Object.keys(productCommissions).length > 0;
  // profit and commission of one order: per item (selling price - supplier price) x pieces, commission = that profit x the product's commission %
  const orderProfit = (o) => {
    let profit = 0; let unknown = 0; let commission = 0;
    const lines = [];
    for (const it of o.items || []) {
      const c = productCosts[String(it.id)];
      const cm = productCommissions[String(it.id)];
      const q = parseInt(it.quantity, 10) || 0;
      let lineProfit;
      if (c && c.supplierCost !== undefined && c.supplierCost !== null && c.supplierCost !== '') {
        const ccs = c.colorCosts || {};
        const ck = Object.keys(ccs).find((k) => k.toLowerCase() === String(it.color || '').trim().toLowerCase());
        const unit = ck !== undefined ? (Number(ccs[ck]) || 0) : (Number(c.supplierCost) || 0);
        lineProfit = ((it.basePrice !== undefined ? Number(it.basePrice) || 0 : Number(it.price) || 0) - unit) * q; // the store price: a shop's markup is not profit to share
      } else if (cm && typeof cm.profit === 'number') {
        // Admins do not get the supplier price: the profit per piece saved with the commission is used instead
        const cps = cm.colorProfit || {};
        const pk = Object.keys(cps).find((k) => k.toLowerCase() === String(it.color || '').trim().toLowerCase());
        lineProfit = (pk !== undefined ? Number(cps[pk]) || 0 : cm.profit) * q;
      } else { unknown += q; continue; }
      const pct = (productCommissions[String(it.id)] && Number(productCommissions[String(it.id)].pct)) || 0;
      const lineComm = lineProfit > 0 ? Math.round(lineProfit * pct) / 100 : 0;
      profit += lineProfit; commission += lineComm;
      lines.push({ name: it.name, q, profit: lineProfit, pct, comm: lineComm });
    }
    return { profit, unknown, commission, lines };
  };
  const doReset = async (p) => {
    if (!(await askConfirm(`Reset the stats of ${p.name}?\n\nTheir numbers start again from zero from now. Orders and products are not changed or deleted.`, { danger: true, confirmText: 'Yes, reset' }))) return;
    try { await resetAdminStats(p.email || p.key); setResets((r) => ({ ...r, [String(p.email || p.key).toLowerCase()]: new Date() })); }
    catch (err) { alert('Could not reset: ' + (err.code === 'permission-denied' ? 'only the Owner can do this (publish the latest Firestore rules).' : err.message)); }
  };

  const { people, events } = useMemo(() => {
    const ppl = {};
    const evs = []; // { who, kind, at, order }
    const person = (email, name) => {
      const k = keyOf(email, name);
      if (!k) return null;
      if (!ppl[k]) ppl[k] = { key: k, name: name || email || k, email: email || '' };
      if (name) ppl[k].name = name;
      return k;
    };
    for (const o of orders) {
      // confirmed
      const conf = lastEntry(o, 'Processing');
      const cEmail = o.confirmedBy || (conf && conf.by) || '';
      const cName = o.confirmedByName || (conf && conf.byName) || '';
      if (cEmail || cName) {
        const k = person(cEmail, cName);
        if (k) evs.push({ who: k, kind: 'confirmed', at: toDate(conf && conf.at) || toDate(o.updatedAt) || toDate(o.createdAt), order: o });
      }
      // sold by an Admin (the Admin placed the order): this Admin earns the commission once it is delivered
      if (o.soldBy && o.status === 'Delivered') {
        const de = lastEntry(o, 'Delivered');
        const k = person(o.soldBy, '');
        if (k) evs.push({ who: k, kind: 'sold', at: toDate(de && de.at) || toDate(o.updatedAt) || toDate(o.createdAt), order: o });
      }
      // shop orders: the shop owner earns the markup once the order is delivered
      const so = o.shop ? shopOwners[o.shop] : null;
      if (so && o.status === 'Delivered') {
        const de = lastEntry(o, 'Delivered');
        const k = person(so.email, so.name);
        if (k) evs.push({ who: k, kind: 'shop', at: toDate(de && de.at) || toDate(o.updatedAt) || toDate(o.createdAt), order: o });
      }
      // delivered / cancelled (the person who pressed it)
      for (const [status, kind] of [['Delivered', 'delivered'], ['Cancelled', 'cancelled']]) {
        const e = o.status === status ? lastEntry(o, status) : null;
        if (e && (e.by || e.byName)) {
          const k = person(e.by, e.byName);
          if (k) evs.push({ who: k, kind, at: toDate(e.at) || toDate(o.updatedAt), order: o });
        }
      }
    }
    return { people: ppl, events: evs };
  }, [orders, shopOwners]);

  const [rs, re] = rangeFor(preset, from, to);
  const inRange = (d) => !!d && (!rs || d >= rs) && (!re || d <= re);

  const stats = useMemo(() => {
    const out = {};
    const get = (k) => (out[k] = out[k] || { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {}, profit: 0, unknownCost: 0, commTotal: 0, comm: [], shop: [], shopTotal: 0, mine: { orders: 0, pieces: 0, sales: 0, list: {} } });
    const owner = {}; products.forEach((pr) => { owner[String(pr.id)] = keyOf(pr.addedBy, pr.addedByName); });
    for (const ev of events) {
      if (!inRange(ev.at)) continue;
      const rt = resets[ev.who];
      if (rt && (!ev.at || ev.at <= rt)) continue; // before the Owner reset this person's stats
      const s = get(ev.who);
      if (ev.kind !== 'sold') s[ev.kind].push(ev);
      if (ev.kind === 'shop') s.shopTotal += markupOf(ev.order);
      const em = String((people[ev.who] || {}).email || '').toLowerCase();
      const role = isOwner ? roles[em] : (ev.who === me ? adminRole : '');
      if (((ev.kind === 'sold') || (ev.kind === 'confirmed' && !ev.order.soldBy)) && ev.order.status === 'Delivered' && role !== 'manager' && role !== 'owner') { // Admins earn commission, Managers earn the shop markup
        const { profit, unknown, commission, lines } = orderProfit(ev.order);
        s.profit += profit; s.unknownCost += unknown; s.commTotal += commission; s.comm.push({ ev, profit, unknown, commission, lines });
      }
      if (ev.kind === 'confirmed' && ev.order.status !== 'Cancelled') {
        s.sales += Number(ev.order.total) || 0;
        for (const it of ev.order.items || []) {
          const q = parseInt(it.quantity, 10) || 0;
          s.pieces += q;
          s.products[it.name] = (s.products[it.name] || 0) + q;
        }
      }
    }
    // "My products sold": orders that contain a product this person added, whoever confirmed the order
    for (const ev of events) {
      if (ev.kind !== 'confirmed' || ev.order.status === 'Cancelled' || !inRange(ev.at)) continue;
      const seen = new Set();
      for (const it of ev.order.items || []) {
        const k = owner[String(it.id)];
        if (!k) continue;
        const rt = resets[k];
        if (rt && (!ev.at || ev.at <= rt)) continue;
        const m = get(k).mine;
        const q = parseInt(it.quantity, 10) || 0;
        m.pieces += q;
        m.sales += (Number(it.price) || 0) * q;
        m.list[it.name] = (m.list[it.name] || 0) + q;
        seen.add(k);
      }
      seen.forEach((k) => { get(k).mine.orders += 1; });
    }
    return out; // eslint-disable-next-line
  }, [events, preset, from, to, resets, products, productCosts, productCommissions, roles, adminRole]);

  // products each person added (a separate list under their card)
  const addedBy = useMemo(() => {
    const m = {};
    for (const p of products) {
      const k = keyOf(p.addedBy, p.addedByName);
      if (!k) continue;
      (m[k] = m[k] || []).push(p);
      if (!people[k]) people[k] = { key: k, name: p.addedByName || p.addedBy, email: p.addedBy || '' }; // eslint-disable-line react-hooks/exhaustive-deps
    }
    return m;
  }, [products, people]);

  const visibleKeys = Object.keys(people).filter((k) => isOwner || k === me);
  const rows = visibleKeys
    .map((k) => ({ ...people[k], s: stats[k] || { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {}, profit: 0, unknownCost: 0, commTotal: 0, comm: [], shop: [], shopTotal: 0, mine: { orders: 0, pieces: 0, sales: 0, list: {} } } }))
    .sort((a, b) => b.s.confirmed.length - a.s.confirmed.length);
  const shown = isOwner ? rows : (rows.length ? rows : [{ key: me, name: adminName || loggedInUserEmail || 'You', email: loggedInUserEmail || '', s: { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {}, profit: 0, unknownCost: 0, commTotal: 0, comm: [], shop: [], shopTotal: 0, mine: { orders: 0, pieces: 0, sales: 0, list: {} } } }]);

  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const inputCls = `block mt-1 border p-2 text-xs rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`;

  return (
    <div className="space-y-5">
      <div className={card}>
        <div>
          <h3 className="text-lg font-bold">{isOwner ? 'Team Performance' : 'My Performance'}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {isOwner ? 'Who confirmed, delivered and cancelled how many orders, and the products and sales behind them.' : 'The orders you confirmed, delivered and cancelled.'}
            {' '}Sales and products count confirmed orders that were not cancelled later.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => setPreset(p.id)} className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition ${preset === p.id ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#222] text-gray-700 dark:text-gray-300'}`}>{p.label}</button>
          ))}
          {preset === 'custom' && (
            <>
              <label className="text-[11px] text-gray-500 ml-2">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
              <label className="text-[11px] text-gray-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
            </>
          )}
        </div>
      </div>

      {shown.map((p) => {
        const s = p.s;
        const isOpen = open === p.key || !isOwner;
        const prods = Object.entries(s.products).sort((a, b) => b[1] - a[1]);
        return (
          <div key={p.key} className={card}>
            <button type="button" onClick={() => isOwner && setOpen(open === p.key ? '' : p.key)} className={`w-full text-left ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{p.name}{p.key === me ? ' (you)' : ''}</p>
                  {p.email && <p className="text-[11px] text-gray-500">{p.email}</p>}
                  {p.key !== me && <p className="text-[11px] mt-1"><span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold">{p.key === me ? 'My products' : 'Products added'} ({(addedBy[p.key] || []).length})</span></p>}
                </div>
                {isOwner && <span className="text-[11px] text-[#D4AF37] font-bold uppercase tracking-wider">{isOpen ? 'Hide orders' : 'Show orders'}</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-center">
                {[
                  ['Confirmed', s.confirmed.length, ''],
                  ['Delivered', s.delivered.length, 'text-green-600'],
                  ['Cancelled', s.cancelled.length, 'text-red-500'],
                  ['Pieces', s.pieces, ''],
                  ['Sales', formatPrice(s.sales), 'text-[#D4AF37]'],
                ].map(([label, v, c]) => (
                  <div key={label} className={`rounded border p-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`text-xl font-bold ${c}`}>{v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </button>

            {(s.mine.orders > 0 || (addedBy[p.key] || []).length > 0) && (
              <div className={`rounded border p-3 text-xs ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                <p className="font-bold uppercase tracking-wider text-[11px] mb-2">{p.key === me ? 'My products sold' : 'Their products sold'} <span className="font-normal normal-case text-gray-500">(orders with products {p.key === me ? 'you' : 'they'} added, whoever confirmed them)</span></p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-lg font-bold">{s.mine.orders}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">Orders</p></div>
                  <div><p className="text-lg font-bold">{s.mine.pieces}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">Pieces</p></div>
                  <div><p className="text-lg font-bold text-[#D4AF37]">{formatPrice(s.mine.sales)}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">Sales</p></div>
                </div>
                {Object.keys(s.mine.list).length > 0 && <p className="mt-2 text-gray-500">{Object.entries(s.mine.list).sort((a, b) => b[1] - a[1]).map(([n, q]) => `${n} ×${q}`).join(' · ')}</p>}
              </div>
            )}

            {(s.shop.length > 0 || Object.entries(shopOwners).some(([, o]) => String(o.email || '').toLowerCase() === String(p.email || '').toLowerCase())) && (
              <div className={`rounded border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                <span><strong>Shop earnings</strong> (markup on delivered orders from {p.key === me ? 'your' : 'their'} shop link): {s.shop.length} order(s)</span>
                <strong className="text-[#D4AF37] text-base">{formatPrice(s.shopTotal)}</strong>
              </div>
            )}

            {anyCommission && (
              <div className={`rounded border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`}>
                <span><strong>Commission</strong> on delivered orders {p.key === me ? 'you' : 'they'} confirmed{showProfit ? `: profit ${formatPrice(s.profit)}` : ''}{s.unknownCost > 0 ? ` (${s.unknownCost} pcs without a profit figure are not counted)` : ''}</span>
                <strong className="text-[#D4AF37] text-base">{formatPrice(s.commTotal)}</strong>
              </div>
            )}

            {(isOwner || resets[String(p.email || p.key).toLowerCase()]) && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>{resets[String(p.email || p.key).toLowerCase()] ? `Counting since ${formatDateTime(resets[String(p.email || p.key).toLowerCase()])} (reset by the Owner)` : ''}</span>
                {isOwner && <button type="button" onClick={() => doReset(p)} className="px-3 py-1.5 rounded text-[11px] font-bold border border-red-500 text-red-500 hover:bg-red-500/10 transition">Reset stats</button>}
              </div>
            )}

            {isOpen && (
              <div className="space-y-4 border-t pt-4">
                {p.key !== me && (() => {
                  const mine = addedBy[p.key] || [];
                  return (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2">{p.key === me ? 'My products' : 'Products added'} ({mine.length})</p>
                      {mine.length === 0 ? <p className="text-xs text-gray-500">No products added yet.</p> : (
                        <div className="divide-y text-xs">
                          {mine.map((pr) => (
                            <div key={pr.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-2 min-w-0">
                                {pr.image && <img src={pr.image} alt="" className="w-8 h-8 object-cover rounded border shrink-0" />}
                                <span className="truncate">{pr.name}</span>
                              </span>
                              <span className="flex items-center gap-3 text-gray-500">
                                <span>{formatPrice(pr.price)}</span>
                                <span>{pr.status === 'pending' ? 'Waiting for approval' : 'Live'}</span>
                                <span>Sold {parseInt(pr.sold, 10) || 0}</span>
                                {canEditProduct && startEditProduct && canEditProduct(pr) && <button type="button" onClick={() => startEditProduct(pr)} className="underline text-[#D4AF37] font-semibold">Edit</button>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">Products in confirmed orders</p>
                  {prods.length === 0 ? <p className="text-xs text-gray-500">None in this period.</p> : (
                    <div className="divide-y text-sm">
                      {prods.map(([name, q]) => <div key={name} className="py-1.5 flex justify-between gap-3"><span>{name}</span><span className="font-semibold">&times; {q}</span></div>)}
                    </div>
                  )}
                </div>
                {s.shop.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Shop earnings details</p>
                    <p className="text-[11px] text-gray-500 mb-2">Markup = (price the customer paid &minus; store price) &times; pieces, counted when the order is delivered. The whole markup belongs to the Manager who owns the shop. Admins who confirm these orders earn their usual commission on the store profit.</p>
                    <div className="divide-y text-xs">
                      {[...s.shop].sort((a, b) => (b.at || 0) - (a.at || 0)).map((ev) => (
                        <div key={ev.order.orderNumber + 'sh'} className="py-2 space-y-0.5">
                          <div className="flex justify-between gap-3"><strong className="text-[#D4AF37]">{ev.order.orderNumber}</strong><strong className="text-[#D4AF37]">{formatPrice(markupOf(ev.order))}</strong></div>
                          {(ev.order.items || []).map((it, i) => (
                            <p key={i} className="text-gray-500">{it.name} &times;{it.quantity}: sold {formatPrice(it.price)}, store price {formatPrice(it.basePrice !== undefined ? it.basePrice : it.price)}</p>
                          ))}
                        </div>
                      ))}
                      <div className="py-2 flex justify-between font-bold"><span>Total shop earnings</span><span className="text-[#D4AF37]">{formatPrice(s.shopTotal)}</span></div>
                    </div>
                  </div>
                )}
                {anyCommission && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Commission details</p>
                    <p className="text-[11px] text-gray-500 mb-2">Commission = profit of the product &times; the commission % the Owner set for that product. {showProfit ? 'Profit = (selling price − supplier price) × pieces. ' : ''}Only <strong>Delivered</strong> orders {p.key === me ? 'you' : 'they'} confirmed are counted (commission is for Admins; Managers earn the shop markup), cancelled or returned orders earn nothing.</p>
                    {s.comm.length === 0 ? <p className="text-xs text-gray-500">No delivered orders in this period yet.</p> : (
                      <div className="divide-y text-xs">
                        {[...s.comm].sort((a, b) => (b.ev.at || 0) - (a.ev.at || 0)).map((c) => (
                          <div key={c.ev.order.orderNumber + 'c'} className="py-2 space-y-0.5">
                            <div className="flex justify-between gap-3"><strong className="text-[#D4AF37]">{c.ev.order.orderNumber}</strong><strong className="text-[#D4AF37]">{formatPrice(c.commission)}</strong></div>
                            {c.lines.map((l, i) => (
                              <p key={i} className="text-gray-500">{l.name} &times;{l.q}: {showProfit ? `profit ${formatPrice(l.profit)}` : ''}{l.pct > 0 ? `${showProfit ? ' × ' : ''}${l.pct}% = ${formatPrice(Math.round(l.profit * l.pct) / 100)}` : ' no commission on this product'}</p>
                            ))}
                            {c.unknown > 0 && <p className="text-gray-500">{c.unknown} pcs without a profit figure are not counted</p>}
                          </div>
                        ))}
                        <div className="py-2 flex justify-between font-bold"><span>Total commission</span><span className="text-[#D4AF37]">{formatPrice(s.commTotal)}</span></div>
                      </div>
                    )}
                  </div>
                )}
                {[['Confirmed orders', s.confirmed], ['Delivered orders', s.delivered], ['Cancelled orders', s.cancelled]].map(([title, list]) => (
                  list.length > 0 && (
                    <div key={title}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2">{title} ({list.length})</p>
                      <div className="divide-y text-xs">
                        {[...list].sort((a, b) => (b.at || 0) - (a.at || 0)).map((ev) => (
                          <div key={ev.order.orderNumber + title} className="py-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <span><strong className="text-[#D4AF37]">{ev.order.orderNumber}</strong> · {ev.order.customer && ev.order.customer.name} · {(ev.order.items || []).map((it) => `${it.name} ×${it.quantity}`).join(', ')}</span>
                            <span className="text-gray-500">{formatDateTime(ev.at)} · <strong>{formatPrice(ev.order.total)}</strong> · {ev.order.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        );
      })}
      {isOwner && rows.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No confirmed orders yet.</p>}
    </div>
  );
}
