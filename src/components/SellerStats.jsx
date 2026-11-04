import React, { useMemo, useState } from 'react';

// Premium seller tools on their own orders (from the earnings API: order number, date, status, products, markup;
// never customer details): Sales stats for a period, and a monthly earnings CSV download.
const DAY = 86400000;
const ms = (v) => { const t = Date.parse(v); return Number.isFinite(t) ? t : 0; };
const monthKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function SellerStats({ orders = [], formatPrice, isDarkMode, statsOn, csvOn }) {
  const [days, setDays] = useState(30);
  const months = useMemo(() => [...new Set(orders.map((o) => ms(o.createdAt)).filter(Boolean).map(monthKey))].sort().reverse(), [orders]);
  const [month, setMonth] = useState('');
  const box = `rounded-lg border p-4 space-y-3 ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-50'}`;
  const lock = <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-500">🔒 Premium</span>;

  const st = useMemo(() => {
    const from = Date.now() - days * DAY;
    const list = orders.filter((o) => ms(o.createdAt) >= from);
    const delivered = list.filter((o) => o.status === 'Delivered' && !o.returned);
    const returned = list.filter((o) => o.returned).length;
    const cancelled = list.filter((o) => o.status === 'Cancelled').length;
    const pieces = delivered.reduce((n, o) => n + o.items.reduce((m, it) => m + it.quantity, 0), 0);
    const earned = delivered.reduce((n, o) => n + o.earned, 0);
    const byProduct = {};
    delivered.forEach((o) => o.items.forEach((it) => { const p = (byProduct[it.name] = byProduct[it.name] || { q: 0, m: 0 }); p.q += it.quantity; p.m += Math.max(0, it.price - it.basePrice) * it.quantity; }));
    const top = Object.entries(byProduct).sort((a, b) => b[1].q - a[1].q).slice(0, 5);
    // orders per day (bars), oldest -> newest
    const bars = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const start = new Date(); start.setHours(0, 0, 0, 0); const t0 = start.getTime() - (Math.min(days, 30) - 1 - i) * DAY;
      return list.filter((o) => { const t = ms(o.createdAt); return t >= t0 && t < t0 + DAY; }).length;
    });
    return { total: list.length, delivered: delivered.length, returned, cancelled, pieces, earned, top, bars };
  }, [orders, days]);
  const maxBar = Math.max(1, ...st.bars);

  const downloadCsv = () => {
    const m = month || months[0];
    if (!m) return;
    const rows = orders.filter((o) => ms(o.createdAt) && monthKey(ms(o.createdAt)) === m);
    const lines = [['Order', 'Date', 'Status', 'Returned', 'Product', 'Size', 'Color', 'Qty', 'Your price', 'Store price', 'Markup', 'Earned'].map(csvCell).join(',')];
    rows.forEach((o) => o.items.forEach((it, i) => {
      const mk = Math.max(0, it.price - it.basePrice) * it.quantity;
      lines.push([o.orderNumber, new Date(ms(o.createdAt)).toISOString().slice(0, 10), o.status, o.returned ? 'yes' : 'no', it.name, it.size, it.color, it.quantity, it.price, it.basePrice, mk, i === 0 ? o.earned : ''].map(csvCell).join(','));
    }));
    lines.push(['Total', '', '', '', '', '', '', '', '', '', '', rows.reduce((n, o) => n + o.earned, 0)].map(csvCell).join(','));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kyvro-earnings-${m}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-3">
      <div className={`${box} ${statsOn ? '' : 'opacity-60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider">Sales stats {statsOn ? '' : lock}</p>
          {statsOn && (
            <div className="flex gap-1 text-[11px]">
              {[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`px-2.5 py-1 rounded font-bold ${days === d ? 'bg-[#D4AF37] text-black' : 'border border-gray-400/40'}`}>{d} days</button>)}
            </div>
          )}
        </div>
        {statsOn ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              {[['Orders', st.total], ['Delivered', st.delivered], ['Returned', st.returned], ['Pieces sold', st.pieces], ['Earned', formatPrice(st.earned)]].map(([l, v]) => (
                <div key={l} className={`rounded border p-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-200 bg-white'}`}><p className="text-lg font-bold">{v}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">{l}</p></div>
              ))}
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Orders per day (last {Math.min(days, 30)} days)</p>
              <div className="flex items-end gap-[2px] h-16" role="img" aria-label="Orders per day">
                {st.bars.map((n, i) => <div key={i} className="flex-1 rounded-t bg-[#D4AF37]" style={{ height: `${Math.max(4, (n / maxBar) * 100)}%`, opacity: n ? 1 : 0.25 }} title={`${n} order(s)`} />)}
              </div>
            </div>
            {st.top.length > 0 && (
              <div className="text-xs">
                <p className="font-semibold mb-1">Best sellers (delivered)</p>
                {st.top.map(([name, p]) => <p key={name} className="flex justify-between gap-2"><span className="truncate">{name}</span><span className="text-gray-500 shrink-0">×{p.q} · {formatPrice(p.m)}</span></p>)}
              </div>
            )}
          </>
        ) : <p className="text-[11px] text-gray-500">Orders, delivered, returned, pieces, earnings and best sellers for 7 / 30 / 90 days.</p>}
      </div>

      <div className={`${box} ${csvOn ? '' : 'opacity-60'}`}>
        <p className="text-xs font-bold uppercase tracking-wider">Monthly earnings CSV {csvOn ? '' : lock}</p>
        {csvOn ? (
          months.length === 0 ? <p className="text-[11px] text-gray-500">No orders yet.</p> : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select value={month || months[0]} onChange={(e) => setMonth(e.target.value)} className={`border p-1.5 rounded ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-white border-gray-300'}`}>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button type="button" onClick={downloadCsv} className="px-3 py-1.5 rounded bg-[#D4AF37] text-black font-bold">Download CSV</button>
              <span className="text-gray-500">Order, date, products, your price, markup, status. No customer details.</span>
            </div>
          )
        ) : <p className="text-[11px] text-gray-500">Download one month of orders and markup as a spreadsheet.</p>}
      </div>
    </div>
  );
}
