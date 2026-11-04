// /api/plan?action=sync (see api/plan.js): copies the caller's plan end date (subscriptions/{uid}.paidUntil) onto their shop(s).
// Needed for a shop made AFTER the plan was paid, because the storefront can only read the shop, not the private plan.
// The caller must be a signed-in Manager / Admin; nothing comes from the browser except the login token.
import { accessToken } from '../_sslc.js';
import { planCaller, syncShops } from '../_plans.js';
import { FS, val } from '../_sslc.js';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const me = await planCaller(req);
    if (me.error) return res.status(me.status).json({ error: me.error });
    const token = await accessToken();
    const r = await fetch(`${FS}/documents/subscriptions/${me.uid}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return res.status(200).json({ synced: 0 });
    const until = val(((await r.json()).fields || {}).paidUntil);
    if (!until) return res.status(200).json({ synced: 0 });
    return res.status(200).json({ synced: await syncShops(token, me.uid, until) });
  } catch (e) {
    return res.status(200).json({ synced: 0, error: e.message || 'failed' });
  }
}
