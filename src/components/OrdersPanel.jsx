import React, { useState, useEffect } from 'react';
import { ORDER_STATUSES, DELIVERY_AREA_BN } from '../data/shopConfig';
import { updateOrderStatus, markOrderPaid } from '../orders';
import { formatDateTime, toDate } from '../utils/dates';
import { phoneKey, emailKey } from '../data/shopConfig';
import { watchBlocked, blockPhone, blockEmail, unblockPhone, unblockEmail } from '../blocklist';

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

export default function OrdersPanel({ orders, isDarkMode, formatPrice, adminName, loggedInUserEmail, canUnblock }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState({ phones: {}, emails: {} });
  const [showBlocked, setShowBlocked] = useState(false);
  const [openIds, setOpenIds] = useState({}); // which orders are expanded (all start collapsed)
  const toggleOpen = (id) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));

  useEffect(() => {
    const stop = watchBlocked(setBlocked);
    return () => stop();
  }, []);

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
    run(o.id, async () => {
      const { skipped } = await updateOrderStatus(o.id, status, staff);
      if (skipped && skipped.length) {
        alert('The order was updated, but the stock of these items was NOT changed (they are not in Firestore yet, or the size no longer exists):\n' + skipped.join('\n') + '\nUpdate their stock by hand.');
      }
    });
  };

  const doBlockPhone = (o) => {
    if (!confirm(`Block the phone number ${o.customer?.phone}? New orders from this number will be refused.`)) return;
    run(o.id, () => blockPhone(o.customer.phone, o.orderNumber, staff));
  };
  const doBlockEmail = (o) => {
    if (!confirm(`Block the account ${o.email}? New orders from this account will be refused.`)) return;
    run(o.id, () => blockEmail(o.email, o.orderNumber, staff));
  };
  const doUnblock = (kind, key) => {
    if (!confirm('Unblock this customer?')) return;
    run(key, () => (kind === 'phone' ? unblockPhone(key) : unblockEmail(key)));
  };
  const blockedCount = Object.keys(blocked.phones).length + Object.keys(blocked.emails).length;

  const exportCSV = () => {
    const rows = ['Order Number,Date,Customer,Phone,Address,Delivery Area,Items,Subtotal (BDT),Discount (BDT),Delivery (BDT),Total (BDT),Payment Method,Payment Status,Status'];
    orders.forEach((o) => {
      const items = (o.items || []).map((i) => `${i.name}${i.size && i.size !== 'Standard' ? ` (${i.size})` : ''} x${i.quantity}`).join('; ');
      rows.push([o.orderNumber, formatDateTime(o.createdAt), o.customer?.name, o.customer?.phone, o.customer?.address, o.deliveryArea, items, o.subtotal, o.discount || 0, o.shipping, o.total, o.paymentMethod, o.paymentStatus, o.status].map(csv).join(','));
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

      {/* blocked customers */}
      <div className={`${cardClass} !space-y-3`}>
        <button onClick={() => setShowBlocked(!showBlocked)} className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span>Blocked customers ({blockedCount})</span>
          <span className="text-[#D4AF37]">{showBlocked ? 'Hide' : 'Show'}</span>
        </button>
        {showBlocked && (
          blockedCount === 0
            ? <p className="text-xs text-gray-500">Nobody is blocked. To block someone, open one of their orders below and use the Block buttons.</p>
            : (
              <div className="space-y-2">
                {Object.entries(blocked.phones).map(([key, b]) => (
                  <div key={'p' + key} className="flex flex-wrap items-center justify-between gap-2 text-xs border rounded p-2.5">
                    <span><strong>Phone</strong> {b.phone || key} <span className="text-gray-500">· blocked by {b.blockedByName || b.blockedBy} {b.at ? `· ${formatDateTime(b.at)}` : ''} {b.orderNumber ? `· ${b.orderNumber}` : ''}</span></span>
                    {canUnblock && <button onClick={() => doUnblock('phone', key)} className="px-3 py-1.5 rounded text-[11px] font-semibold border hover:border-[#D4AF37]">Unblock</button>}
                  </div>
                ))}
                {Object.entries(blocked.emails).map(([key, b]) => (
                  <div key={'e' + key} className="flex flex-wrap items-center justify-between gap-2 text-xs border rounded p-2.5">
                    <span><strong>Account</strong> {b.email || key} <span className="text-gray-500">· blocked by {b.blockedByName || b.blockedBy} {b.at ? `· ${formatDateTime(b.at)}` : ''} {b.orderNumber ? `· ${b.orderNumber}` : ''}</span></span>
                    {canUnblock && <button onClick={() => doUnblock('email', key)} className="px-3 py-1.5 rounded text-[11px] font-semibold border hover:border-[#D4AF37]">Unblock</button>}
                  </div>
                ))}
                {!canUnblock && <p className="text-[11px] text-gray-500">Only the Owner or a Manager can unblock.</p>}
              </div>
            )
        )}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-10">
          {orders.length === 0 ? 'No orders yet. New orders from customers will appear here automatically.' : 'No orders match this filter.'}
        </p>
      )}

      {visible.map((o) => {
        const busy = busyId === o.id;
        const isOpen = !!openIds[o.id];
        const history = Array.isArray(o.history) ? [...o.history].sort((a, b) => (toDate(a.at) || 0) - (toDate(b.at) || 0)) : [];
        return (
          <div key={o.id} className={`${cardClass} !space-y-0 !p-0 overflow-hidden`}>
            {/* short row: click to open / close the details */}
            <button type="button" onClick={() => toggleOpen(o.id)} aria-expanded={isOpen}
              className={`w-full text-left flex items-center gap-3 p-3 sm:p-4 transition ${isDarkMode ? 'hover:bg-[#1d1d1d]' : 'hover:bg-gray-50'}`}>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#D4AF37]">{o.orderNumber}</p>
                  <p className="text-[11px] text-gray-500">{formatDateTime(o.createdAt)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{o.customer?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{o.customer?.phone}</p>
                </div>
                <p className="text-[11px] text-gray-500 truncate sm:self-center">
                  {(o.items || []).reduce((n, i) => n + (parseInt(i.quantity, 10) || 0), 0)} item(s): {(o.items || []).map((i) => i.name).join(', ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
                <p className="text-sm font-bold mt-1">{formatPrice(o.total)}</p>
              </div>
              <span className="text-[#D4AF37] text-lg leading-none shrink-0" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
            <div className="p-4 sm:p-5 space-y-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* customer */}
              <div className={innerClass}>
                <p className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-semibold">{o.customer?.name}</p>
                <p>Phone: <a href={`tel:${o.customer?.phone}`} className="text-[#D4AF37] font-semibold">{o.customer?.phone}</a></p>
                <p>Address: {o.customer?.address}</p>
                <p>Area: {o.deliveryArea} {DELIVERY_AREA_BN[o.deliveryArea] ? `(${DELIVERY_AREA_BN[o.deliveryArea]})` : ''}</p>
                {o.customer?.notes && <p>Comment: <em>{o.customer.notes}</em></p>}
                {o.email && <p>Account: <strong>{o.email}</strong></p>}
                <div className="flex flex-wrap gap-2 pt-2">
                  {blocked.phones[phoneKey(o.customer?.phone)]
                    ? <span className="px-3 py-1.5 rounded text-[11px] font-bold bg-red-600/15 text-red-500">Phone blocked</span>
                    : <button disabled={busy} onClick={() => doBlockPhone(o)} className="px-3 py-1.5 rounded text-[11px] font-semibold border border-red-500/50 text-red-500 hover:bg-red-500/10 disabled:opacity-50">Block this phone</button>}
                  {o.email && (blocked.emails[emailKey(o.email)]
                    ? <span className="px-3 py-1.5 rounded text-[11px] font-bold bg-red-600/15 text-red-500">Account blocked</span>
                    : <button disabled={busy} onClick={() => doBlockEmail(o)} className="px-3 py-1.5 rounded text-[11px] font-semibold border border-red-500/50 text-red-500 hover:bg-red-500/10 disabled:opacity-50">Block this account</button>)}
                </div>
              </div>

              {/* money */}
              <div className={innerClass}>
                <p className="font-bold text-[11px] uppercase tracking-wider text-gray-500 mb-1">Payment</p>
                <p>Method: <strong>{o.paymentMethod}</strong></p>
                <p>Status: <strong className={PAYMENT_STYLE[o.paymentStatus] || ''}>{o.paymentStatus}</strong></p>
                <p>Subtotal: {formatPrice(o.subtotal)}</p>
                {o.discount > 0 && <p className="text-green-600">Discount{o.discountLabel ? ` (${o.discountLabel})` : ''}: - {formatPrice(o.discount)}</p>}
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
              {o.stockDeducted && <p className="text-green-600">• Stock deducted for this order</p>}
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
                <button disabled={busy} onClick={() => setStatus(o, 'Cancelled', `Cancel order ${o.orderNumber}?`)} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Cancel order</button>
              )}
              {o.status === 'Cancelled' && (
                <button disabled={busy} onClick={() => setStatus(o, 'Pending', `Reopen order ${o.orderNumber} as Pending?`)} className={`${btn} bg-gray-700 text-white hover:bg-gray-800`}>Reopen as pending</button>
              )}
            </div>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
