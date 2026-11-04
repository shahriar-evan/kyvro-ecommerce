// Vercel serverless function: opens an UddoktaPay payment page (bKash / Nagad / Rocket ...) for an order that is already saved.
// The amount always comes from the saved order, never from the browser. The API key stays here on the server.
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   UDDOKTAPAY_BASE_URL   e.g. https://sandbox.uddoktapay.com  (or your live panel URL, no trailing slash)
//   UDDOKTAPAY_API_KEY    API key from the UddoktaPay dashboard
import { SITE, getOrder, amountDue, verifyOrderPrices } from './_sslc.js';
import { uddoktaConfigured, UDDOKTA_BASE, UDDOKTA_KEY } from './_uddokta.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!uddoktaConfigured()) return res.status(503).json({ error: 'Online payment is not set up yet.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderNumber = String(body.orderNumber || '');
    const order = await getOrder(orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const due = amountDue(order);
    if (due.error) return res.status(409).json({ error: due.error });
    if (!(due.amount > 0)) return res.status(400).json({ error: 'Invalid order amount.' });
    const check = await verifyOrderPrices(order);
    if (!check.ok) {
      console.warn('Order price check failed', orderNumber, check.problems.join('; '));
      return res.status(409).json({ error: 'The prices in this order do not match the store. Please empty your cart and order again.' });
    }

    const c = order.customer || {};
    const r = await fetch(`${UDDOKTA_BASE}/api/checkout-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'RT-UDDOKTAPAY-API-KEY': UDDOKTA_KEY },
      body: JSON.stringify({
        full_name: String(c.name || 'Customer').slice(0, 60),
        email: String(order.email || 'noreply@kyvro.store'),
        amount: due.amount.toFixed(2),
        metadata: { orderNumber, kind: due.kind },
        redirect_url: `${SITE}/api/uddokta-callback`,
        return_type: 'GET',
        cancel_url: `${SITE}/api/uddokta-callback?r=cancel&order=${encodeURIComponent(orderNumber)}&kind=${due.kind}`,
        webhook_url: `${SITE}/api/uddokta-callback?r=ipn`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.status || !j.payment_url) {
      console.error('UddoktaPay charge failed', r.status, j.message);
      return res.status(502).json({ error: 'The payment page could not be opened. Please try again.' });
    }
    return res.status(200).json({ url: j.payment_url, kind: due.kind, amount: due.amount });
  } catch (e) {
    console.error('uddokta-init', e);
    return res.status(500).json({ error: 'Payment could not be started. Please try again or contact us.' });
  }
}
