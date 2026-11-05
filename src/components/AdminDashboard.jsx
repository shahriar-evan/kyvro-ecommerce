import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, ShoppingBag, Package, Users, Store, Clock, TrendingUp } from 'lucide-react';
import { toDate, formatDateTime } from '../utils/dates';
import { watchAllShops } from '../shops';

// Admin Portal > Dashboard and Analytics. Only numbers the team already sees in Orders / Products: order totals, counts,
// product names. No supplier cost or profit here (profit stays in Team Stats for the Owner / Managers), and customers are
// only counted (by phone), never listed.
const DAY = 86400000;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const counted = (o) => o.status !== 'Cancelled' && !o.returned; // money that is (or will be) real
const qtyOf = (it) => parseInt(it && it.quantity, 10) || 0;
const ms = (o) => { const d = toDate(o.createdAt); return d ? d.getTime() : 0; };

function useCard(isDarkMode) {
  return {
    card: `rounded-2xl border p-5 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`,
    sub: isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-50 border-gray-200',
  };
}

function Stat({ label, value, note, Icon, tint, isDarkMode, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`text-left w-full rounded-2xl border p-4 flex items-center gap-3 transition ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} ${onClick ? 'hover:border-[#D4AF37]/70' : ''}`}>
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon size={20} /></span>
      <span className="min-w-0">
        <span className="block text-[11px] text-gray-500 truncate">{label}</span>
        <span className="block text-lg sm:text-xl font-bold truncate">{value}</span>
        {note && <span className="block text-[11px] text-gray-500 truncate">{note}</span>}
      </span>
    </Tag>
  );
}

// one-series vertical bars (gold), value on hover; the title of the card names the series, so no legend
function DayBars({ days, formatPrice, isDarkMode }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  const [hover, setHover] = useState(-1);
  const h = hover >= 0 ? days[hover] : null;
  return (
    <div>
      <div className="h-6 text-xs text-gray-500">{h ? <span><strong className={isDarkMode ? 'text-white' : 'text-black'}>{formatPrice(h.value)}</strong> · {h.orders} order{h.orders === 1 ? '' : 's'} · {h.label}</span> : 'Hover a bar for the day'}</div>
      <div className="relative h-44 flex items-end gap-[2px]" onMouseLeave={() => setHover(-1)}>
        {/* recessive grid: half and full */}
        <span className={`pointer-events-none absolute inset-x-0 top-0 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`} />
        <span className={`pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`} />
        {days.map((d, i) => (
          <button key={d.key} type="button" aria-label={`${d.label}: ${formatPrice(d.value)}, ${d.orders} orders`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
            className="relative flex-1 h-full flex items-end focus:outline-none">
            <span className={`w-full rounded-t-[4px] transition-opacity ${d.value > 0 ? 'bg-[#D4AF37]' : isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} ${hover >= 0 && hover !== i ? 'opacity-50' : ''}`}
              style={{ height: d.value > 0 ? `${Math.max(3, (d.value / max) * 100)}%` : '3px' }} />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-500"><span>{days[0] && days[0].label}</span><span>Today</span></div>
    </div>
  );
}

// ranked horizontal bars: label + value in text ink, the bar only shows the size
function RankBars({ rows, valueText, isDarkMode, empty = 'Nothing yet.' }) {
  if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${valueText(r)}`}>
          <div className="flex justify-between gap-3 text-xs"><span className="truncate">{r.label}</span><strong className="shrink-0">{valueText(r)}</strong></div>
          <div className={`mt-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="h-2 rounded-full bg-[#D4AF37]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const STATUS_ORDER = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_STYLE = { Pending: 'bg-yellow-500/15 text-yellow-700', Processing: 'bg-blue-500/15 text-blue-600', Shipped: 'bg-purple-500/15 text-purple-600', Delivered: 'bg-green-500/15 text-green-700', Cancelled: 'bg-red-500/15 text-red-600' };

export function AdminDashboard({ orders = [], products = [], adminRole, adminName, formatPrice, isDarkMode, goTab, canSeeProfit }) {
  const { card } = useCard(isDarkMode);
  const isOwner = adminRole === 'owner';
  const [shops, setShops] = useState(null);
  useEffect(() => (isOwner ? watchAllShops(setShops, () => setShops([])) : undefined), [isOwner]);
  const s = useMemo(() => {
    const now = Date.now();
    const today = startOfDay(now);
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const inRange = (o, from) => ms(o) >= from;
    const money = (list) => list.filter(counted).reduce((n, o) => n + (Number(o.total) || 0), 0);
    const todayOrders = orders.filter((o) => inRange(o, today));
    const monthOrders = orders.filter((o) => inRange(o, month.getTime()));
    const phones = new Set(orders.map((o) => String((o.customer && o.customer.phone) || '').replace(/\D/g, '').slice(-10)).filter(Boolean));
    return {
      revToday: money(todayOrders), revMonth: money(monthOrders),
      ordToday: todayOrders.length, ordMonth: monthOrders.length,
      pending: orders.filter((o) => o.status === 'Pending').length,
      cancelReq: orders.filter((o) => o.cancelRequest && o.cancelRequest.status === 'pending' && o.status !== 'Cancelled').length,
      live: products.filter((p) => (p.status || 'approved') === 'approved').length,
      waiting: products.filter((p) => (p.status || 'approved') !== 'approved').length,
      customers: phones.size,
    };
  }, [orders, products]);
  const liveShops = shops ? shops.filter((x) => x.active !== false && x.status !== 'pending' && !x.killed) : [];
  const latest = [...orders].sort((a, b) => ms(b) - ms(a)).slice(0, 6);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      <div className={`${card} !space-y-1`}>
        <h2 className="text-xl sm:text-2xl font-bold">{hello}, {(adminName || 'Kyvro').split(' ')[0]}!</h2>
        <p className="text-xs text-gray-500">Everything at a glance. Money counts every order except cancelled and returned ones.</p>
      </div>
      {(s.pending > 0 || s.cancelReq > 0 || s.waiting > 0) && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-xs flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5"><Clock size={14} /> Needs you</span>
          {s.pending > 0 && <button type="button" onClick={() => goTab('orders')} className="underline font-semibold">{s.pending} new order{s.pending === 1 ? '' : 's'}</button>}
          {s.cancelReq > 0 && <button type="button" onClick={() => goTab('orders')} className="underline font-semibold">{s.cancelReq} cancel request{s.cancelReq === 1 ? '' : 's'}</button>}
          {s.waiting > 0 && <button type="button" onClick={() => goTab('products')} className="underline font-semibold">{s.waiting} product{s.waiting === 1 ? '' : 's'} waiting for approval</button>}
        </div>
      )}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat isDarkMode={isDarkMode} label="Revenue today" value={formatPrice(s.revToday)} note={`${formatPrice(s.revMonth)} this month`} Icon={Wallet} tint="bg-[#D4AF37]/15 text-[#B8921F]" />
        <Stat isDarkMode={isDarkMode} label="Orders today" value={s.ordToday} note={`${s.ordMonth} this month`} Icon={ShoppingBag} tint="bg-green-600/10 text-green-600" onClick={() => goTab('orders')} />
        <Stat isDarkMode={isDarkMode} label="Live products" value={s.live} note={s.waiting ? `${s.waiting} waiting` : 'all approved'} Icon={Package} tint="bg-purple-500/10 text-purple-500" onClick={() => goTab('products')} />
        <Stat isDarkMode={isDarkMode} label="Customers" value={s.customers} note="people who ordered" Icon={Users} tint="bg-blue-500/10 text-blue-500" />
        {isOwner && <Stat isDarkMode={isDarkMode} label="Live shops" value={shops ? liveShops.length : '-'} note={shops ? `${shops.filter((x) => x.kind === 'seller').length} seller shops` : ''} Icon={Store} tint="bg-teal-500/10 text-teal-600" onClick={() => goTab('sellers')} />}
        <Stat isDarkMode={isDarkMode} label="Analytics" value="30 days" note="sales, top products, shops" Icon={TrendingUp} tint="bg-gray-500/10 text-gray-500" onClick={() => goTab('analytics')} />
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold">Latest orders</h3>
          <button type="button" onClick={() => goTab('orders')} className="text-xs font-semibold text-[#B8921F] underline">All orders</button>
        </div>
        {latest.length === 0 ? <p className="text-sm text-gray-500">No orders yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-gray-500"><th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">From</th><th className="py-2 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-500/15">
                {latest.map((o) => (
                  <tr key={o.id || o.orderNumber}>
                    <td className="py-2 pr-3 font-bold text-[#B8921F] whitespace-nowrap">{o.orderNumber}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[o.status] || 'bg-gray-500/15 text-gray-500'}`}>{o.returned ? 'Returned' : o.status}</span></td>
                    <td className="py-2 pr-3 truncate max-w-[10rem]">{o.shop ? `Shop: ${o.shop}` : 'Main store'}</td>
                    <td className="py-2 text-right font-bold whitespace-nowrap">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {canSeeProfit && <p className="text-[11px] text-gray-500">Profit and commission are in <button type="button" onClick={() => goTab('stats')} className="underline text-[#B8921F] font-semibold">Team Stats</button>.</p>}
    </div>
  );
}

export function AdminAnalytics({ orders = [], formatPrice, isDarkMode }) {
  const { card } = useCard(isDarkMode);
  const [range, setRange] = useState(30);
  const a = useMemo(() => {
    const today = startOfDay(Date.now());
    const from = today - (range - 1) * DAY;
    const list = orders.filter((o) => ms(o) >= from);
    const days = Array.from({ length: range }, (_, i) => {
      const t = from + i * DAY;
      const dayOrders = list.filter((o) => startOfDay(ms(o)) === t);
      return { key: t, label: new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), orders: dayOrders.length, value: dayOrders.filter(counted).reduce((n, o) => n + (Number(o.total) || 0), 0) };
    });
    const status = STATUS_ORDER.map((st) => ({ key: st, label: st, value: list.filter((o) => (o.returned ? 'Returned' : o.status) === st).length })).filter((r) => r.value > 0);
    const returned = list.filter((o) => o.returned).length;
    if (returned) status.push({ key: 'Returned', label: 'Returned', value: returned });
    const prod = new Map();
    list.filter(counted).forEach((o) => (o.items || []).forEach((it) => {
      const k = String(it.id || it.name);
      const cur = prod.get(k) || { key: k, label: it.name || k, value: 0, money: 0 };
      cur.value += qtyOf(it); cur.money += (Number(it.price) || 0) * qtyOf(it);
      prod.set(k, cur);
    }));
    const shops = new Map();
    list.filter(counted).forEach((o) => {
      const k = o.shop || '__main';
      const cur = shops.get(k) || { key: k, label: o.shop ? o.shop : 'Main store', value: 0, money: 0 };
      cur.value += 1; cur.money += Number(o.total) || 0;
      shops.set(k, cur);
    });
    const pay = new Map();
    list.forEach((o) => { const k = o.paymentMethod || 'Other'; pay.set(k, (pay.get(k) || 0) + 1); });
    const real = list.filter(counted);
    const revenue = real.reduce((n, o) => n + (Number(o.total) || 0), 0);
    return {
      days, status, revenue, orders: list.length, avg: real.length ? revenue / real.length : 0,
      delivered: list.filter((o) => o.status === 'Delivered' && !o.returned).length,
      products: [...prod.values()].sort((x, y) => y.value - x.value).slice(0, 6),
      shops: [...shops.values()].sort((x, y) => y.money - x.money).slice(0, 6),
      pay: [...pay.entries()].map(([k, v]) => ({ key: k, label: k, value: v })).sort((x, y) => y.value - x.value),
    };
  }, [orders, range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Analytics</h2>
          <p className="text-xs text-gray-500">Sales of the whole store (main store and every shop link). Cancelled and returned orders do not count as money.</p>
        </div>
        <div className={`inline-flex rounded-full border p-1 text-xs font-bold ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`} role="group" aria-label="Time range">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" aria-pressed={range === n} onClick={() => setRange(n)} className={`px-3 py-1.5 rounded-full ${range === n ? 'bg-[#D4AF37] text-black' : 'text-gray-500'}`}>{n} days</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat isDarkMode={isDarkMode} label="Revenue" value={formatPrice(a.revenue)} Icon={Wallet} tint="bg-[#D4AF37]/15 text-[#B8921F]" />
        <Stat isDarkMode={isDarkMode} label="Orders" value={a.orders} Icon={ShoppingBag} tint="bg-green-600/10 text-green-600" />
        <Stat isDarkMode={isDarkMode} label="Average order" value={formatPrice(a.avg)} Icon={TrendingUp} tint="bg-blue-500/10 text-blue-500" />
        <Stat isDarkMode={isDarkMode} label="Delivered" value={a.delivered} Icon={Package} tint="bg-purple-500/10 text-purple-500" />
      </div>
      <div className={card}>
        <h3 className="text-sm font-bold mb-2">Revenue per day</h3>
        <DayBars days={a.days} formatPrice={formatPrice} isDarkMode={isDarkMode} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className={card}><h3 className="text-sm font-bold mb-3">Top products (pieces sold)</h3><RankBars rows={a.products} valueText={(r) => `${r.value} pcs · ${formatPrice(r.money)}`} isDarkMode={isDarkMode} /></div>
        <div className={card}><h3 className="text-sm font-bold mb-3">Sales by shop</h3><RankBars rows={a.shops} valueText={(r) => `${formatPrice(r.money)} · ${r.value} order${r.value === 1 ? '' : 's'}`} isDarkMode={isDarkMode} /></div>
        <div className={card}><h3 className="text-sm font-bold mb-3">Orders by status</h3><RankBars rows={a.status} valueText={(r) => String(r.value)} isDarkMode={isDarkMode} /></div>
        <div className={card}><h3 className="text-sm font-bold mb-3">Payment method</h3><RankBars rows={a.pay} valueText={(r) => `${r.value} order${r.value === 1 ? '' : 's'}`} isDarkMode={isDarkMode} /></div>
      </div>
    </div>
  );
}
