// /api/plan?action=init (see api/plan.js): opens an UddoktaPay payment page for a shop plan (Paid = all products for periodDays).
// The caller must be a signed-in Manager / Admin (Firebase login token). The amount always comes from settings/plans
// on the server, never from the browser. The API key stays here on the server.
//
// Environment variables: UDDOKTAPAY_BASE_URL, UDDOKTAPAY_API_KEY, FIREBASE_SERVICE_ACCOUNT (all already used for orders)
import { SITE, accessToken } from '../_sslc.js';
import { uddoktaConfigured, UDDOKTA_BASE, UDDOKTA_KEY } from '../_uddokta.js';
import { readPlans, planCaller } from '../_plans.js';
import { planPrice } from '../../src/data/priceCheck.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!uddoktaConfigured()) return res.status(503).json({ error: 'Online payment is not set up yet.' });
  try {
    const me = await planCaller(req);
    if (me.error) return res.status(me.status).json({ error: me.error });
    const plans = await readPlans(await accessToken());
    if (!plans.enabled) return res.status(409).json({ error: 'Shop plans are switched off right now.' });
    const amount = planPrice(plans);
    if (!(amount > 0)) return res.status(400).json({ error: 'Invalid plan price.' });

    const r = await fetch(`${UDDOKTA_BASE}/api/checkout-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'RT-UDDOKTAPAY-API-KEY': UDDOKTA_KEY },
      body: JSON.stringify({
        full_name: String(me.name || me.email).slice(0, 60),
        email: me.email,
        amount: amount.toFixed(2),
        // checked again when UddoktaPay confirms the payment (api/_plans.js)
        metadata: { kind: 'plan', uid: me.uid, email: me.email, name: String(me.name || '').slice(0, 80), amount: String(amount), days: String(plans.periodDays) },
        redirect_url: `${SITE}/api/plan?action=callback`,
        return_type: 'GET',
        cancel_url: `${SITE}/api/plan?action=callback&r=cancel`,
        webhook_url: `${SITE}/api/plan?action=callback&r=ipn`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.status || !j.payment_url) {
      console.error('UddoktaPay plan charge failed', r.status, j.message);
      return res.status(502).json({ error: 'The payment page could not be opened. Please try again.' });
    }
    return res.status(200).json({ url: j.payment_url, amount });
  } catch (e) {
    console.error('plan-init', e);
    return res.status(500).json({ error: 'Payment could not be started. Please try again.' });
  }
}
