// POST /api/plan?action=ai-photo  (team only)
// Makes a FRONT or SIDE product photo with Google Gemini image editing ("Nano Banana") from a product photo, on a plain
// white background. The Admin product form (ShowcasePhotoField) then removes the white background in the browser and
// the team member decides to use it or not (nothing is saved here).
//
// Body: { source: 'https://…' or 'data:image/…;base64,…', view: 'front' | 'side', kind: 'garment' | 'shoe' }
// Answer: { image: 'data:image/png;base64,…', model } or { error, code } with code
//   'no-key' (GEMINI_API_KEY missing), 'bad-key', 'no-credit' (quota / billing finished), 'daily-limit', 'no-image', 'bad-source'.
//
// Environment: GEMINI_API_KEY (Google AI Studio, billing on), optional GEMINI_IMAGE_MODEL, optional AI_PHOTO_DAILY_LIMIT (60).
// Uses per day are counted in aiUsage/{YYYY-MM-DD} (server only; no client rule allows it).
import { FS, accessToken, val } from '../_sslc.js';
import { ownerEmails } from '../_owners.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const models = () => [...new Set([process.env.GEMINI_IMAGE_MODEL, 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'].filter(Boolean))];
const dailyLimit = () => Math.max(1, parseInt(process.env.AI_PHOTO_DAILY_LIMIT || '60', 10) || 60);

const KEEP = 'Keep the exact same product: same colours, fabric, pattern, print, buttons, zips, stitching and every detail. '
  + 'Do not add, change, translate or invent any text, letters, numbers, logos or brand names; if a logo is not visible from this angle, leave that area plain. '
  + 'No person, no mannequin, no hands, no props, no extra items. Pure plain white background (#FFFFFF) with no shadow, no floor and no gradient. '
  + 'Show the whole product centred with empty white space around it, sharp focus, soft even studio light, photorealistic e-commerce product photo.';
const PROMPTS = {
  garment: {
    front: 'Show this exact same garment hanging on a simple wooden clothes hanger, seen straight from the front, hanging neatly and not folded. ' + KEEP,
    side: 'Show this exact same garment hanging on a simple wooden clothes hanger, seen from the side as a full 90-degree side profile, '
      + 'so only one sleeve and the side seam face the camera, as if it hangs on a clothing rail. ' + KEEP,
  },
  shoe: {
    front: 'Show this exact same single shoe seen from the outer side (classic side profile, toe pointing left). ' + KEEP,
    side: 'Show this exact same single shoe seen at a three-quarter angle from the front. ' + KEEP,
  },
};

// The caller must be on the team: an active entry in admins/{email} (read with their own login, so the token is real),
// or the Owner (no entry needed: the read then answers 404, which Firestore only does for a valid login).
async function teamCaller(req) {
  const auth = req.headers.authorization || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let claims = {};
  try { claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')); } catch (e) { /* bad token */ }
  const email = String(claims.email || '').toLowerCase();
  if (!email) return { error: 'Please sign in.', status: 401 };
  const r = await fetch(`${FS}/documents/admins/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (r.ok) {
    const f = Object.fromEntries(Object.entries((await r.json()).fields || {}).map(([k, v]) => [k, val(v)]));
    if (f.active === false) return { error: 'Your team access is off.', status: 403 };
    return { email };
  }
  if (r.status === 404 && claims.email_verified === true) {
    const owners = await ownerEmails(await accessToken());
    if (owners.has(email)) return { email };
  }
  return { error: 'Only the team can use this.', status: 403 };
}

async function readSource(source) {
  const s = String(source || '');
  const m = s.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (m) return { mime: m[1] === 'image/jpg' ? 'image/jpeg' : m[1], data: m[2] };
  if (!/^https:\/\/[^\s]+$/.test(s) || s.length > 2000) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(s, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const type = String(r.headers.get('content-type') || '').split(';')[0].trim();
    if (!r.ok || !/^image\/(png|jpeg|webp)$/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return null;
    return { mime: type, data: buf.toString('base64') };
  } catch (e) { return null; } finally { clearTimeout(t); }
}

async function usage(token, day, add = 0) {
  const path = `${FS}/documents/aiUsage/${day}`;
  const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const now = r.ok ? Number(val(((await r.json()).fields || {}).count) || 0) : 0;
  if (!add) return now;
  await fetch(`${path}?updateMask.fieldPaths=count&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { count: { integerValue: String(now + add) }, updatedAt: { stringValue: new Date().toISOString() } } }),
  });
  return now + add;
}

// one Gemini call; { image } / { next: true } (model not available, try the next) / { error, code }
async function callGemini(key, model, src, prompt) {
  const r = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: src.mime, data: src.data } }, { text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (r.ok) {
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const img = parts.find((p) => (p.inlineData || p.inline_data) && /^image\//.test((p.inlineData || p.inline_data).mimeType || (p.inlineData || p.inline_data).mime_type || ''));
    if (!img) return { error: 'Gemini did not send a picture back (it may have refused this photo). Try again or use another photo.', code: 'no-image' };
    const d = img.inlineData || img.inline_data;
    return { image: `data:${d.mimeType || d.mime_type};base64,${d.data}` };
  }
  const msg = String((j.error && j.error.message) || '');
  const status = String((j.error && j.error.status) || '');
  if (r.status === 404 || /not found|is not supported|unknown model/i.test(msg)) return { next: true };
  if (r.status === 429 || status === 'RESOURCE_EXHAUSTED' || /billing|quota|credit|exceeded/i.test(msg)) {
    return { error: 'Your Gemini API credit / quota is finished (or billing is off).', code: 'no-credit' };
  }
  if (/api key|API_KEY/i.test(msg) || r.status === 401 || r.status === 403) return { error: 'The Gemini API key is not valid.', code: 'bad-key' };
  return { error: `Gemini could not make the picture (${r.status}). Try again.`, code: 'failed' };
}

export default async function aiPhoto(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  const who = await teamCaller(req);
  if (who.error) return res.status(who.status).json({ error: who.error });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI photos are not set up yet (GEMINI_API_KEY is missing in Vercel).', code: 'no-key' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const view = body.view === 'side' ? 'side' : 'front';
  const kind = body.kind === 'shoe' ? 'shoe' : 'garment';
  const src = await readSource(body.source);
  if (!src) return res.status(400).json({ error: 'This photo could not be opened. Use a JPG / PNG / WebP photo or link.', code: 'bad-source' });

  const token = await accessToken();
  const day = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10); // Bangladesh day
  const limit = dailyLimit();
  if ((await usage(token, day)) >= limit) {
    return res.status(429).json({ error: `Today's AI photo limit (${limit}) is used up. Try again tomorrow.`, code: 'daily-limit' });
  }

  for (const model of models()) {
    const out = await callGemini(key, model, src, PROMPTS[kind][view]);
    if (out.next) continue;
    if (out.error) return res.status(out.code === 'no-credit' ? 402 : 502).json({ error: out.error, code: out.code });
    await usage(token, day, 1);
    return res.status(200).json({ image: out.image, model });
  }
  return res.status(502).json({ error: 'No Gemini image model is available for this key. Set GEMINI_IMAGE_MODEL in Vercel.', code: 'failed' });
}
