// Vercel serverless function: UddoktaPay sends the customer's browser back here (with ?invoice_id=...)
// and also calls it as a webhook (?r=ipn). A payment is only trusted after UddoktaPay's verify API confirms it.
import { SITE } from './_sslc.js';
import { uddoktaConfigured, confirmUddokta } from './_uddokta.js';

export const config = { maxDuration: 30 };

const back = (res, status, order, kind, amount) => {
  const q = new URLSearchParams({ pay: status, ...(order ? { order } : {}), ...(kind === 'advance' ? { kind } : {}), ...(amount ? { amt: String(Math.round(Number(amount))) } : {}) });
  res.statusCode = 303;
  res.setHeader('Location', `${SITE}/?${q}`);
  res.end();
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const query = req.query || {};
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (e) { return Object.fromEntries(new URLSearchParams(req.body)); } })() : (req.body || {});
  const mode = String(query.r || '');
  const invoice = String(query.invoice_id || body.invoice_id || '');

  if (!uddoktaConfigured()) return mode === 'ipn' ? res.status(503).end('not configured') : back(res, 'fail', '', 'full');
  if (mode === 'cancel') return back(res, 'cancel', '', 'full');
  try {
    const r = await confirmUddokta(invoice);
    if (!r.ok) console.warn('UddoktaPay payment not confirmed:', r.reason, r.orderNumber || '');
    if (mode === 'ipn') return res.status(200).end('OK');
    return back(res, r.ok ? 'ok' : 'fail', r.orderNumber, r.kind, r.ok ? r.amount : 0);
  } catch (e) {
    console.error('uddokta-callback', e);
    if (mode === 'ipn') return res.status(500).end('error');
    return back(res, 'check', '', 'full'); // could not verify right now: the team will check it
  }
}
