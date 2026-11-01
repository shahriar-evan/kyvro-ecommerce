// Vercel serverless function: opens an SSLCommerz payment session (bKash + cards) for an order that is already saved.
// The amount always comes from the saved order, never from the browser.
import { SITE, SSL_BASE, sslConfigured, getOrder } from './_sslc.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!sslConfigured()) return res.status(503).json({ error: 'Online payment is not set up yet.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderNumber = String(body.orderNumber || '');
    const order = await getOrder(orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.paymentMethod !== 'Online Payment') return res.status(400).json({ error: 'This order is Cash on Delivery.' });
    if (order.paymentStatus === 'Paid') return res.status(409).json({ error: 'This order is already paid.' });
    if (order.status === 'Cancelled') return res.status(409).json({ error: 'This order was cancelled.' });
    const total = Number(order.total);
    if (!(total > 0)) return res.status(400).json({ error: 'Invalid order amount.' });

    const cb = (r) => `${SITE}/api/sslcommerz-callback?r=${r}`;
    const c = order.customer || {};
    const form = new URLSearchParams({
      store_id: process.env.SSLCOMMERZ_STORE_ID,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: total.toFixed(2),
      currency: 'BDT',
      tran_id: `${orderNumber}_${Date.now().toString(36)}`,
      success_url: cb('success'),
      fail_url: cb('fail'),
      cancel_url: cb('cancel'),
      ipn_url: cb('ipn'),
      shipping_method: 'NO',
      product_name: `Kyvro order ${orderNumber}`.slice(0, 250),
      product_category: 'Fashion',
      product_profile: 'general',
      cus_name: String(c.name || 'Customer').slice(0, 50),
      cus_email: String(order.email || 'noreply@kyvro.store'),
      cus_add1: String(c.address || 'Bangladesh').slice(0, 50),
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: String(c.phone || '01700000000'),
      value_a: orderNumber,
    });
    if (process.env.SSLCOMMERZ_METHODS) form.set('multi_card_name', process.env.SSLCOMMERZ_METHODS);
    const r = await fetch(`${SSL_BASE}/gwprocess/v4/api.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const j = await r.json().catch(() => ({}));
    if (j.status !== 'SUCCESS' || !j.GatewayPageURL) {
      console.error('SSLCommerz session failed', j.status, j.failedreason);
      return res.status(502).json({ error: 'The payment page could not be opened. Please try again.' });
    }
    return res.status(200).json({ url: j.GatewayPageURL });
  } catch (e) {
    console.error('sslcommerz-init', e);
    return res.status(500).json({ error: 'Payment could not be started. Please try again or contact us.' });
  }
}
