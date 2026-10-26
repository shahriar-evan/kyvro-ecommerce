import React, { useState } from 'react';
import { ORDER_STATUSES, DELIVERY_AREA_BN } from '../data/shopConfig';
import { updateOrderStatus, markOrderPaid } from '../orders';
import { formatDateTime, toDate } from '../utils/dates';

const STATUS_STYLE = {
  Pending: 'bg-yellow-500/15 text-yellow-600',
  Processing: 'bg-blue-500/15 text-blue-500',
  Shipped: 'bg-purple-500/15 text-purple-500',
  Delivered: 'bg-green-500/15 text-green-600',
  Cancelled: 'bg-red-500/15 text-red-500',
};

const PAYMENT_STYLE = {
  Paid: 'text-green-600',
  'Awaiting payment': 'text-yellow-600',
  'Cash on Delivery': 'text-gray-500',
};

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function OrdersPanel({ orders, isDarkMode, formatPrice, adminName, loggedInUserEmail }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const staff = { email: loggedInUserEmail, name: adminName || loggedInUserEmail };
  const countOf = (s) => orders.filter((o) => o.status === s).length;

  const q = search.trim().toLowerCase();
  const visible = orders.filter((o) => {
    if (filter !== 'All' && o.status !== filter) return false;
    if (!q) return true;
    return [o.orderNumber, o.customer?.name, o.customer?.phone].some((v) => String(v || '').toLowerCase().includes(q));
  });

  const run = async (orderId, fn) => {
    setError('');
    setBusyId(orderId);
    try { await fn(); } catch (err) { setError(err.code === 'permission-denied' ? 'Permission denied. Make sure the latest Firestore rules are published.' : (err.message || 'Could not update the order.')); }
    setBusyId(null);
  };

  const setStatus = (o, status, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    run(o.id, () => updateOrderStatus(o.id, status, staff));
  };

  const exportCSV = () => {
    const rows = ['Order Number,Date,Customer,Phone,Address,Delivery Area,Items,Subtotal (BDT),Delivery (BDT),Total (BDT),Payment Method,Payment Status,Status'];
    orders.forEach((o) => {
      const items = (o.items || []).map((i) => `${i.name}${i.size && i.size !== 'Standard' ? ` (${i.size})` : ''} x${i.quantity}`).join('; ');
      rows.push([o.orderNumber, formatDateTime(o.createdAt), o.customer?.name, o.customer?.phone, o.customer?.address, o.deliveryArea, items, o.subtotal, o.shipping, o.total, o.paymentMethod, o.paymentStatus, o.status].map(csv).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kyvro-orders-${Date.now()}.csv`;
    a.click();
  };

  const cardClass = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const innerClass = `rounded border p-3 text-xs space-y-1 ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-50 border-gray-200'}`;
  const btn = 'px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50';

  return (
    <div className="space-y-5">
      {/* summary + filters */}
      <div className={`${cardClass} !space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Total orders: <strong className="font-bold">{orders.length}</strong></p>
          <button onClick={exportCSV} className="bg-[#D4AF37] text-black text-xs font-bold px-4 py-2 rounded uppercase tracking-wider">Export Orders to CSV</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...ORDER_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition ${filter === s ? 'bg-[#D4AF37] text-black' : 'bg-gray-200 dark:bg-[#222] text-gray-700 dark:text-gray-300'}`}
            >
              {s} ({s === 'All' ? orders.length : countOf(s)})
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number, name or phone..."
          className={`w-full border p-2.5 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
        />
        {error && <p className="text-xs p-3 rounded border border-red-500/40 text-red-500 bg-red-500/10">{error}</p>}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-10">
          {orders.length === 0 ? 'No orders yet. New orders from customers will appear here automatically.' : 'No orders match this filter.'}
        </p>
      )}

      {visible.map((o) => {
        const busy = busyId === o.id;
        const history = Array.isArray(o.history) ? [...o.history].sort((a, b) => (toDate(a.at) || 0) - (toDate(b.at) || 0)) : [];
        return (
          <div key={o.id} className={cardClass}>
            {/* header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-sm font-bold text-[#D4AF37]">{o.orderNumber}</p>
                <p className="text-xs text-gray-500">Ordered on {formatDateTime(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
                <p className="text-sm font-bold mt-1">{formatPrice(o.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* customer */}
              <div className={innerClass}>
                <p className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-semibold">{o.customer?.name}</p>
                <p>Phone: <a href={`tel:${o.customer?.phone}`} className="text-[#D4AF37] font-semibold">{o.customer?.phone}</a></p>
                <p>Address: {o.customer?.address}</p>
                <p>Area: {o.deliveryArea} {DELIVERY_AREA_BN[o.deliveryArea] ? `(${DELIVERY_AREA_BN[o.deliveryArea]})` : ''}</p>
                {o.customer?.notes && <p>Comment: <em>{o.customer.notes}</em></p>}
              </div>

              {/* money */}
              <div className={innerClass}>
                <p className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-1">Payment</p>
                <p>Method: <strong>{o.paymentMethod}</strong></p>
                <p>Status: <strong className={PAYMENT_STYLE[o.paymentStatus] || ''}>{o.paymentStatus}</strong></p>
                <p>Subtotal: {formatPrice(o.subtotal)}</p>
                <p>Delivery: {o.shipping === 0 ? 'FREE' : formatPrice(o.shipping)}</p>
                <p className="text-sm font-bold">Total: {formatPrice(o.total)}</p>
              </div>
            </div>

            {/* items */}
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-2">Products ordered</p>
              <div className="divide-y text-xs">
                {(o.items || []).map((it, i) => (
                  <div key={i} className="py-2 flex items-center gap-3">
                    {it.image && <img src={it.image} alt="" className="w-10 h-10 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{it.name}</p>
                      <p className="text-gray-500">
                        {it.category ? `${it.category} · ` : ''}{it.size && it.size !== 'Standard' ? `Size ${it.size} · ` : ''}{it.color ? `${it.color} · ` : ''}{formatPrice(it.price)} each
                      </p>
                    </div>
                    <span className="font-bold">&times; {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* history */}
            <div className="text-[11px] text-gray-500 space-y-0.5">
              <p>• Order placed · {formatDateTime(o.createdAt)}</p>
              {history.map((h, i) => (
                <p key={i}>• {h.status === 'Processing' ? 'Confirmed, processing started' : h.status} · by {h.byName || h.by} · {formatDateTime(h.at)}</p>
              ))}
            </div>

            {/* actions */}
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {o.status === 'Pending' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Processing')} className={`${btn} bg-green-600 text-white hover:opacity-90`}>Confirm &amp; start processing</button>
              )}
              {o.status === 'Processing' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Shipped')} className={`${btn} bg-purple-600 text-white hover:opacity-90`}>Mark as shipped</button>
              )}
              {o.status === 'Shipped' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Delivered')} className={`${btn} bg-green-600 text-white hover:opacity-90`}>Mark as delivered</button>
              )}
              {o.paymentStatus === 'Awaiting payment' && o.status !== 'Cancelled' && (
                <button disabled={busy} onClick={() => run(o.id, () => markOrderPaid(o.id, staff))} className={`${btn} bg-[#D4AF37] text-black hover:opacity-90`}>Mark payment received</button>
              )}
              {o.status !== 'Cancelled' && o.status !== 'Delivered' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Cancelled', `Cancel order ${o.orderNumber}?`)} className={`${btn} bg-red-950/40 text-red-400 hover:text-red-300`}>Cancel order</button>
              )}
              {o.status === 'Cancelled' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Pending', `Reopen order ${o.orderNumber} as Pending?`)} className={`${btn} bg-gray-200 dark:bg-gray-800 text-gray-600`}>Reopen as pending</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
