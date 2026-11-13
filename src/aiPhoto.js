import { auth } from './firebase';

// Asks the server (api/plan.js?action=ai-photo, team only) for a front / side product photo made by Gemini.
// Returns the picture (white background, data URL). Errors carry .provider ('openrouter' | 'gemini') and .code: no-key, bad-key, no-credit, daily-limit, no-image, bad-source.
export async function makeAiPhoto({ source, view, kind, bg }) {
  const user = auth.currentUser;
  if (!user) { const e = new Error('Please sign in again.'); e.code = 'auth'; throw e; }
  const r = await fetch('/api/plan?action=ai-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ source, view, kind, bg }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (!r.ok || !j.image) {
    const e = new Error(j.error || `The AI photo could not be made (${r.status}).`);
    e.code = j.code || 'failed';
    e.provider = j.provider || 'gemini';
    throw e;
  }
  return j.image;
}

// Shop the Look (Owner / Manager): a model wearing these products, transparent PNG (OpenAI). sources = product photo URLs / data URLs.
export async function makeAiLook({ sources, who }) {
  const user = auth.currentUser;
  if (!user) { const e = new Error('Please sign in again.'); e.code = 'auth'; throw e; }
  const r = await fetch('/api/plan?action=ai-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ view: 'look', sources, who }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (!r.ok || !j.image) {
    const e = new Error(j.error || (r.status === 504 ? 'OpenAI took too long. Try again.' : `The look picture could not be made (${r.status}).`));
    e.code = j.code || 'failed';
    throw e;
  }
  return j.image;
}
