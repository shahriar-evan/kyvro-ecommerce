// Shared UddoktaPay settings + the payment check. Files starting with "_" are not public endpoints.
import { getOrder, markPaid } from './_sslc.js';

export const UDDOKTA_BASE = (process.env.UDDOKTAPAY_BASE_URL || '').replace(/\/$/, '');
export const UDDOKTA_KEY = process.env.UDDOKTAPAY_API_KEY || '';
export const uddoktaConfigured = () => !!(UDDOKTA_BASE && UDDOKTA_KEY);

// Asks UddoktaPay whether the invoice is really paid, then checks it against the saved order and marks it Paid.
// Never trusts the browser: only UddoktaPay's own verify answer and our saved order decide.
// Returns { ok, orderNumber, kind, amount, reason }
export async function confirmUddokta(invoiceId) {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(String(invoiceId || ''))) return { ok: false, reason: 'no invoice_id' };
  const r = await fetch(`${UDDOKTA_BASE}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'RT-UDDOKTAPAY-API-KEY': UDDOKTA_KEY },
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
  const v = await r.json().catch(() => ({}));
  const meta = (v && typeof v.metadata === 'object' && v.metadata) || {};
  const orderNumber = String(meta.orderNumber || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  const kind = meta.kind === 'advance' ? 'advance' : 'full';
  if (String(v.status || '').toUpperCase() !== 'COMPLETED') return { ok: false, pending: String(v.status || '').toUpperCase() === 'PENDING', orderNumber, kind, reason: `status ${v.status || r.status}` };
  const order = await getOrder(orderNumber);
  if (!order) return { ok: false, orderNumber, kind, reason: 'order not found' };
  if (order.paymentMethod === 'Manual bKash / Nagad') return { ok: false, orderNumber, kind, reason: 'manual payment order' };
  const amount = Number(v.amount);
  const expected = kind === 'advance'
    ? (order.paymentMethod === 'Online Payment' ? null : Number(order.shipping) || 0)
    : (order.paymentMethod === 'Online Payment' ? Number(order.total) : null);
  if (expected === null || !(expected > 0)) return { ok: false, orderNumber, kind, reason: 'payment type does not match the order' };
  if (kind === 'full' && order.paymentStatus === 'Paid') return { ok: true, orderNumber, kind, amount, already: true };
  if (kind === 'advance' && order.advancePaid > 0) return { ok: true, orderNumber, kind, amount, already: true };
  if (!(Math.abs(amount - expected) < 0.01)) return { ok: false, orderNumber, kind, reason: 'amount mismatch' };
  await markPaid(orderNumber, {
    gateway: 'UddoktaPay',
    tranId: String(v.transaction_id || invoiceId),
    bankTranId: String(v.sender_number || ''),
    channel: String(v.payment_method || ''),
    amount,
  }, kind);
  return { ok: true, orderNumber, kind, amount };
}
