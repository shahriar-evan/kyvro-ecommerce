// Vercel serverless function: opens an SSLCommerz payment session (bKash + cards) for an order that is already saved.
// The amount always comes from the saved order, never from the browser.
import { SITE, SSL_BASE, sslConfigured, getOrder, amountDue, verifyOrderPrices } from './_sslc.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!sslConfigured()) return res.status(503).json({ error: 'Online payment is not set up yet.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderNumber = String(body.orderNumber || '');
    const method = ['bkash', 'card'].includes(body.method) ? body.method : 'any';
    const order = await getOrder(orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const due = amountDue(order);
    if (due.error) return res.status(409).json({ error: due.error });
    const total = due.amount;
    if (!(total > 0)) return res.status(400).json({ error: 'Invalid order amount.' });
    const check = await verifyOrderPrices(order);
    if (!check.ok) {
      console.warn('Order price check failed', orderNumber, check.problems.join('; '));
      return res.status(409).json({ error: 'The prices in this order do not match the store. Please empty your cart and order again.' });
    }

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
      product_name: (due.kind === 'advance' ? `Delivery charge for Kyvro order ${orderNumber}` : `Kyvro order ${orderNumber}`).slice(0, 250),
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
      value_b: due.kind,
    });
    if (process.env.SSLCOMMERZ_METHODS) form.set('multi_card_name', process.env.SSLCOMMERZ_METHODS);
    const r = await fetch(`${SSL_BASE}/gwprocess/v4/api.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const j = await r.json().catch(() => ({}));
    if (j.status !== 'SUCCESS' || !j.GatewayPageURL) {
      console.error('SSLCommerz session failed', j.status, j.failedreason);
      return res.status(502).json({ error: 'The payment page could not be opened. Please try again.' });
    }
    // bKash: go straight to the bKash page where the customer types their number. Card / Bank: the card + bank list.
    // If SSLCommerz does not give a direct link, the normal payment page is used instead.
    let url = j.GatewayPageURL;
    const gws = Array.isArray(j.desc) ? j.desc : [];
    if (method === 'bkash') {
      const bk = gws.find((g) => g && String(g.gw || g.name || '').toLowerCase().replace(/\s/g, '') === 'bkash' && g.redirectGatewayURL);
      if (bk) url = bk.redirectGatewayURL;
      else if (j.directPaymentURLMFS) url = j.directPaymentURLMFS;
    } else if (method === 'card') {
      if (j.directPaymentURLCard) url = j.directPaymentURLCard;
    }
    return res.status(200).json({ url, kind: due.kind, amount: total });
  } catch (e) {
    console.error('sslcommerz-init', e);
    return res.status(500).json({ error: 'Payment could not be started. Please try again or contact us.' });
  }
}
