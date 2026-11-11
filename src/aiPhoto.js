import { auth } from './firebase';

// Asks the server (api/plan.js?action=ai-photo, team only) for a front / side product photo made by Gemini.
// Returns the picture (white background, data URL). Errors carry .code: no-key, bad-key, no-credit, daily-limit, no-image, bad-source.
export async function makeAiPhoto({ source, view, kind }) {
  const user = auth.currentUser;
  if (!user) { const e = new Error('Please sign in again.'); e.code = 'auth'; throw e; }
  const r = await fetch('/api/plan?action=ai-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ source, view, kind }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (!r.ok || !j.image) {
    const e = new Error(j.error || `The AI photo could not be made (${r.status}).`);
    e.code = j.code || 'failed';
    throw e;
  }
  return j.image;
}
