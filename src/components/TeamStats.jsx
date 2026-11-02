import React, { useMemo, useState } from 'react';
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

export default function TeamStats({ orders, isDarkMode, formatPrice, isOwner, loggedInUserEmail, adminName }) {
  const [preset, setPreset] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState('');
  const me = keyOf(loggedInUserEmail, adminName);

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
  }, [orders]);

  const [rs, re] = rangeFor(preset, from, to);
  const inRange = (d) => !!d && (!rs || d >= rs) && (!re || d <= re);

  const stats = useMemo(() => {
    const out = {};
    const get = (k) => (out[k] = out[k] || { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {} });
    for (const ev of events) {
      if (!inRange(ev.at)) continue;
      const s = get(ev.who);
      s[ev.kind].push(ev);
      if (ev.kind === 'confirmed' && ev.order.status !== 'Cancelled') {
        s.sales += Number(ev.order.total) || 0;
        for (const it of ev.order.items || []) {
          const q = parseInt(it.quantity, 10) || 0;
          s.pieces += q;
          s.products[it.name] = (s.products[it.name] || 0) + q;
        }
      }
    }
    return out; // eslint-disable-next-line
  }, [events, preset, from, to]);

  const visibleKeys = Object.keys(people).filter((k) => isOwner || k === me);
  const rows = visibleKeys
    .map((k) => ({ ...people[k], s: stats[k] || { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {} } }))
    .sort((a, b) => b.s.confirmed.length - a.s.confirmed.length);
  const shown = isOwner ? rows : (rows.length ? rows : [{ key: me, name: adminName || loggedInUserEmail || 'You', email: loggedInUserEmail || '', s: { confirmed: [], delivered: [], cancelled: [], pieces: 0, sales: 0, products: {} } }]);

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

            {isOpen && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2">Products in confirmed orders</p>
                  {prods.length === 0 ? <p className="text-xs text-gray-500">None in this period.</p> : (
                    <div className="divide-y text-sm">
                      {prods.map(([name, q]) => <div key={name} className="py-1.5 flex justify-between gap-3"><span>{name}</span><span className="font-semibold">&times; {q}</span></div>)}
                    </div>
                  )}
                </div>
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
