// /api/plan?action=comp (see api/plan.js): the Owner gives a shop owner a plan by hand (a comp plan), or ends it.
// Body: { uid, tier: 'pro' | 'premium', days } to add days (from the current end date if it still runs), or
// { uid, end: true } to end the plan now. Only the Owner: their login must be able to list sellers/ (Owner-only rule).
import { PROJECT, FS, accessToken } from '../_sslc.js';
import { syncShops, currentPlan } from '../_plans.js';
import { toMillis } from '../../src/data/priceCheck.js';

export const config = { maxDuration: 30 };

export default async function comp(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const auth = req.headers.authorization || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'Please sign in.' });
    const probe = await fetch(`${FS}/documents/sellers?pageSize=1`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!probe.ok) return res.status(403).json({ error: 'Only the Owner can do this.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const uid = String(body.uid || '');
    if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return res.status(400).json({ error: 'Bad member.' });
    const token = await accessToken();
    const cur = await currentPlan(token, uid);
    const now = Date.now();
    let until; let tier;
    if (body.end === true) { until = new Date(now).toISOString(); tier = cur.tier === 'premium' ? 'premium' : 'pro'; }
    else {
      tier = body.tier === 'premium' ? 'premium' : 'pro';
      const days = Math.max(1, Math.min(366, parseInt(body.days, 10) || 30));
      until = new Date(Math.max(now, toMillis(cur.paidUntil)) + days * 86400000).toISOString();
    }
    const at = new Date(now).toISOString();
    const r = await fetch(`${FS}/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{
        update: { name: `projects/${PROJECT}/databases/(default)/documents/subscriptions/${uid}`, fields: { plan: { stringValue: 'comp' }, tier: { stringValue: tier }, paidUntil: { timestampValue: until }, lastPaymentAt: { timestampValue: at }, lastPaymentId: { stringValue: body.end === true ? 'ended-by-owner' : 'comp-by-owner' } } },
        updateMask: { fieldPaths: ['plan', 'tier', 'paidUntil', 'lastPaymentAt', 'lastPaymentId'] },
      }] }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Could not save the plan.' });
    await syncShops(token, uid, until, tier);
    return res.status(200).json({ ok: true, tier, paidUntil: until });
  } catch (e) {
    console.error('plan comp', e);
    return res.status(500).json({ error: 'Could not save the plan.' });
  }
}
