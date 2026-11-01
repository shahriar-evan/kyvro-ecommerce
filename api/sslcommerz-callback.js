// Vercel serverless function: SSLCommerz sends the customer's browser (success / fail / cancel) and a server
// notification (ipn) here. A payment is only trusted after SSLCommerz's own validation API confirms it.
import { SITE, sslConfigured, confirmPayment } from './_sslc.js';

export const config = { maxDuration: 30 };

const back = (res, status, order) => {
  const q = new URLSearchParams({ pay: status, ...(order ? { order } : {}) });
  res.statusCode = 303;
  res.setHeader('Location', `${SITE}/?${q}`);
  res.end();
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const kind = String((req.query && req.query.r) || '');
  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {});
  const order = String(body.value_a || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);

  if (!sslConfigured()) return kind === 'ipn' ? res.status(503).end('not configured') : back(res, 'fail', order);

  if (kind === 'success' || kind === 'ipn') {
    try {
      const r = await confirmPayment(body.val_id);
      if (!r.ok) console.warn('payment not confirmed:', r.reason, r.orderNumber || order);
      if (kind === 'ipn') return res.status(200).end('OK');
      return back(res, r.ok ? 'ok' : 'fail', r.orderNumber || order);
    } catch (e) {
      console.error('sslcommerz-callback', e);
      if (kind === 'ipn') return res.status(500).end('error');
      return back(res, 'check', order); // could not verify right now: the team will check it
    }
  }
  return back(res, kind === 'cancel' ? 'cancel' : 'fail', order);
}
