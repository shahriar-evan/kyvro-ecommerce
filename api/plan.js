// Vercel serverless function for everything about shop plans (and public sellers), in ONE function because the Hobby plan allows at most
// 12 functions per deployment. The real code is in api/_plan/ (files starting with "_" are not separate functions).
//   POST /api/plan?action=init        open an UddoktaPay payment page for a plan (signed-in Manager / Admin)
//   GET  /api/plan?action=callback    UddoktaPay sends the browser back here (&r=ipn: webhook, &r=cancel: cancelled)
//   POST /api/plan?action=sync        copy my plan end date onto my shops (signed-in Manager / Admin)
//   GET  /api/plan?action=reminders   daily reminder emails (Vercel Cron, needs CRON_SECRET)
//   POST /api/plan?action=seller-earnings  a public seller's markup per order (no customer details)
//   POST /api/plan?action=comp        the Owner gives or ends a plan by hand (Plan Members)
//   POST /api/plan?action=warn        the Owner warns a seller about a shop (note saved on the shop + emailed)
//   POST /api/plan?action=billing     my own plan payments (Subscription > Billing history)
import init from './_plan/init.js';
import callback from './_plan/callback.js';
import sync from './_plan/sync.js';
import reminders from './_plan/reminders.js';
import sellerEarnings from './_plan/seller.js';
import comp from './_plan/comp.js';
import warn from './_plan/warn.js';
import billing from './_plan/billing.js';

export const config = { maxDuration: 60 };

const ACTIONS = { init, callback, sync, reminders, 'seller-earnings': sellerEarnings, comp, warn, billing };

export default async function handler(req, res) {
  const action = String((req.query && req.query.action) || '');
  const run = ACTIONS[action];
  if (!run) return res.status(404).json({ error: 'Unknown action.' });
  return run(req, res);
}
