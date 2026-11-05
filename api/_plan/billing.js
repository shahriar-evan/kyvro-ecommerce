// /api/plan?action=billing (see api/plan.js): the signed-in person's own plan payments (subscriptionPayments is
// server-only in firestore.rules). Only their own rows: date, plan, amount, days, method, invoice id.
import { FS, accessToken, val } from '../_sslc.js';
import { planCaller } from '../_plans.js';

export const config = { maxDuration: 30 };

export default async function billing(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const me = await planCaller(req);
    if (me.error) return res.status(me.status).json({ error: me.error });
    const token = await accessToken();
    const r = await fetch(`${FS}/documents:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'subscriptionPayments' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: me.uid } } }, limit: 100 } }),
    });
    if (!r.ok) return res.status(502).json({ error: 'Could not load your payments.' });
    const rows = (await r.json()).filter((x) => x.document);
    const payments = rows.map((x) => {
      const f = Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, val(v)]));
      return {
        invoice: String(x.document.name || '').split('/').pop(),
        at: f.at || '',
        tier: f.tier === 'premium' ? 'premium' : 'pro',
        amount: Number(f.amount) || 0,
        days: parseInt(f.days, 10) || 0,
        method: String(f.method || ''),
      };
    }).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return res.status(200).json({ payments });
  } catch (e) {
    console.error('plan-billing', e);
    return res.status(500).json({ error: 'Could not load your payments.' });
  }
}
