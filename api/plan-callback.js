// Vercel serverless function: UddoktaPay sends the browser back here after a shop plan payment (?invoice_id=...)
// and also calls it as a webhook (?r=ipn). The plan is only extended after UddoktaPay's verify API confirms the payment.
import { SITE } from './_sslc.js';
import { uddoktaConfigured } from './_uddokta.js';
import { confirmPlanPayment } from './_plans.js';

export const config = { maxDuration: 30 };

const back = (res, status) => {
  res.statusCode = 303;
  res.setHeader('Location', `${SITE}/?plan=${status}`);
  res.end();
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const query = req.query || {};
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (e) { return Object.fromEntries(new URLSearchParams(req.body)); } })() : (req.body || {});
  const mode = String(query.r || '');
  const invoice = String(query.invoice_id || body.invoice_id || '');

  if (!uddoktaConfigured()) return mode === 'ipn' ? res.status(503).end('not configured') : back(res, 'fail');
  if (mode === 'cancel') return back(res, 'cancel');
  try {
    const r = await confirmPlanPayment(invoice);
    if (!r.ok) console.warn('Plan payment not confirmed:', r.reason);
    if (mode === 'ipn') return res.status(200).end('OK');
    return back(res, r.ok ? 'ok' : (r.pending ? 'check' : 'fail'));
  } catch (e) {
    console.error('plan-callback', e);
    if (mode === 'ipn') return res.status(500).end('error');
    return back(res, 'check'); // could not verify right now: the webhook or the team will check it
  }
}
