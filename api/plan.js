// Vercel serverless function for everything about shop plans, in ONE function because the Hobby plan allows at most
// 12 functions per deployment. The real code is in api/_plan/ (files starting with "_" are not separate functions).
//   POST /api/plan?action=init        open an UddoktaPay payment page for a plan (signed-in Manager / Admin)
//   GET  /api/plan?action=callback    UddoktaPay sends the browser back here (&r=ipn: webhook, &r=cancel: cancelled)
//   POST /api/plan?action=sync        copy my plan end date onto my shops (signed-in Manager / Admin)
//   GET  /api/plan?action=reminders   daily reminder emails (Vercel Cron, needs CRON_SECRET)
import init from './_plan/init.js';
import callback from './_plan/callback.js';
import sync from './_plan/sync.js';
import reminders from './_plan/reminders.js';

export const config = { maxDuration: 60 };

const ACTIONS = { init, callback, sync, reminders };

export default async function handler(req, res) {
  const action = String((req.query && req.query.action) || '');
  const run = ACTIONS[action];
  if (!run) return res.status(404).json({ error: 'Unknown action.' });
  return run(req, res);
}
