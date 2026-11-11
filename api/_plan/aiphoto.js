// POST /api/plan?action=ai-photo  (team only)
// Makes a FRONT or SIDE product photo with Google Gemini image editing ("Nano Banana") from a product photo, on a plain
// flat-colour background. The Admin product form (ShowcasePhotoField) then removes that background colour in the browser and
// the team member decides to use it or not (nothing is saved here).
//
// Body: { source: 'https://…' or 'data:image/…;base64,…', view: 'front' | 'side' | 'clean' (only remove the background), kind: 'garment' | 'shoe',
//         bg: 'green' | 'magenta' | 'blue' | 'white' (the flat background colour to ask for; the browser removes it) }
// Answer: { image: 'data:image/png;base64,…', model } or { error, code } with code
//   'no-key' (GEMINI_API_KEY missing), 'bad-key', 'no-credit' (quota / billing finished), 'daily-limit', 'no-image', 'bad-source'.
//
// Environment: OPENROUTER_API_KEY (openrouter.ai, prepaid credits; used first when set, same Nano Banana models)
//   or GEMINI_API_KEY (Google AI Studio, billing on). Optional OPENROUTER_IMAGE_MODEL / GEMINI_IMAGE_MODEL,
//   optional AI_PHOTO_DAILY_LIMIT (60). The answer's "provider" tells the Admin box which credit page to link.
// Uses per day are counted in aiUsage/{YYYY-MM-DD} (server only; no client rule allows it).
import { FS, accessToken, val } from '../_sslc.js';
import { ownerEmails } from '../_owners.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const orModels = () => [...new Set([process.env.OPENROUTER_IMAGE_MODEL, 'google/gemini-3.1-flash-image', 'google/gemini-2.5-flash-image', 'google/gemini-3.1-flash-lite-image'].filter(Boolean))];
const models = () => [...new Set([process.env.GEMINI_IMAGE_MODEL, 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'].filter(Boolean))];
const dailyLimit = () => Math.max(1, parseInt(process.env.AI_PHOTO_DAILY_LIMIT || '60', 10) || 60);

// The background is one flat colour that is far from the product's colours (the browser picks it), so the browser can
// cut it out cleanly afterwards: a white hoodie on white would lose its white parts.
const BACKGROUNDS = {
  green: 'solid flat pure chroma-key green (#00FF00)',
  magenta: 'solid flat pure magenta (#FF00FF)',
  blue: 'solid flat pure blue (#0000FF)',
  white: 'pure plain white (#FFFFFF)',
};
const keep = (bg) => 'Keep the exact same product: same colours, fabric, pattern, print, buttons, zips, stitching and every detail. '
  + 'Do not add, change, translate or invent any text, letters, numbers, logos or brand names; if a logo is not visible from this angle, leave that area plain. '
  + `No person, no mannequin, no hands, no props, no extra items. The whole background must be one ${bg} colour, with no shadow, no floor, no gradient, `
  + 'and that colour must not appear on the product or as a colour cast on it. '
  + 'Show the whole product centred with empty space around it, sharp focus, soft even studio light, photorealistic e-commerce product photo.';
const prompts = (bg) => ({
  garment: {
    clean: 'Keep this exact same garment exactly as it is in the photo: same angle, same shape, same colours, print, logos and details. '
      + `Only remove everything around it (background, floor, wall, other items) and put it on a ${bg} background with no shadow. `
      + 'If a person wears it, remove the person and show only the garment. Do not add or change any text or logo. Photorealistic e-commerce product photo.',
    front: 'Show this exact same garment hanging on a simple wooden clothes hanger, seen straight from the front, hanging neatly and not folded. ' + keep(bg),
    side: 'Show this exact same garment hanging on a simple wooden clothes hanger, seen from the side as a full 90-degree side profile, '
      + 'so only one sleeve and the side seam face the camera, as if it hangs on a clothing rail. '
      + 'The front of the garment (collar opening, buttons / zip, hood front) must point to the RIGHT side of the picture, the back to the left. ' + keep(bg),
  },
  shoe: {
    clean: 'Keep this exact same shoe exactly as it is in the photo: same angle, same position, same size, same colours, laces, logos and sole. '
      + `Only remove everything around it (floor, rug, fur, shelf, box, hands, other shoes) and put it on a ${bg} background `
      + 'with no shadow. Do not redraw, restyle or change the shoe, do not add or change any text or logo. Photorealistic e-commerce product photo.',
    front: 'Show this exact same single shoe seen from the outer side (classic side profile, toe pointing left). ' + keep(bg),
    side: 'Show this exact same single shoe seen at a three-quarter angle from the front. ' + keep(bg),
  },
});

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

// one OpenRouter call (OpenAI-style chat with image output); same answers as callGemini
async function callOpenRouter(key, model, src, prompt) {
  const r = await fetch(OPENROUTER, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://kyvro.store', 'X-Title': 'Kyvro' },
    body: JSON.stringify({
      model,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${src.mime};base64,${src.data}` } },
        { type: 'text', text: prompt },
      ] }],
    }),
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  const err = j.error || {};
  const msg = String(err.message || '');
  if (r.ok && !j.error) {
    const m = ((j.choices || [])[0] || {}).message || {};
    const url = (((m.images || [])[0] || {}).image_url || {}).url || '';
    if (!/^data:image\//.test(url)) return { error: 'The AI did not send a picture back (it may have refused this photo). Try again or use another photo.', code: 'no-image' };
    return { image: url };
  }
  const code = Number(err.code || r.status);
  if (code === 402 || /credit|insufficient|balance|limit exceeded|key limit/i.test(msg)) {
    return { error: 'Your OpenRouter credit is finished (or this key reached its limit).', code: 'no-credit' };
  }
  if (code === 401 || code === 403) return { error: 'The OpenRouter API key is not valid.', code: 'bad-key' };
  if (code === 404 || /not a valid model|model.*(not found|does not exist|unavailable)|no endpoints/i.test(msg)) return { next: true };
  if (code === 429) return { error: 'Too many AI requests right now. Wait a minute and try again.', code: 'failed' };
  return { error: `The AI could not make the picture (${code}). Try again.`, code: 'failed' };
}

export default async function aiPhoto(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  const who = await teamCaller(req);
  if (who.error) return res.status(who.status).json({ error: who.error });
  const orKey = process.env.OPENROUTER_API_KEY;
  const key = process.env.GEMINI_API_KEY;
  const provider = orKey ? 'openrouter' : 'gemini';
  if (!orKey && !key) return res.status(503).json({ error: 'AI photos are not set up yet (no OPENROUTER_API_KEY or GEMINI_API_KEY in Vercel).', code: 'no-key', provider: 'openrouter' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const view = ['front', 'side', 'clean'].includes(body.view) ? body.view : 'front';
  const kind = body.kind === 'shoe' ? 'shoe' : 'garment';
  const bg = BACKGROUNDS[body.bg] || BACKGROUNDS.green;
  const prompt = prompts(bg)[kind][view];
  const src = await readSource(body.source);
  if (!src) return res.status(400).json({ error: 'This photo could not be opened. Use a JPG / PNG / WebP photo or link.', code: 'bad-source' });

  const token = await accessToken();
  const day = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10); // Bangladesh day
  const limit = dailyLimit();
  if ((await usage(token, day)) >= limit) {
    return res.status(429).json({ error: `Today's AI photo limit (${limit}) is used up. Try again tomorrow.`, code: 'daily-limit' });
  }

  const list = provider === 'openrouter' ? orModels() : models();
  for (const model of list) {
    const out = provider === 'openrouter'
      ? await callOpenRouter(orKey, model, src, prompt)
      : await callGemini(key, model, src, prompt);
    if (out.next) continue;
    if (out.error) return res.status(out.code === 'no-credit' ? 402 : 502).json({ error: out.error, code: out.code, provider });
    await usage(token, day, 1);
    return res.status(200).json({ image: out.image, model, provider });
  }
  const envName = provider === 'openrouter' ? 'OPENROUTER_IMAGE_MODEL' : 'GEMINI_IMAGE_MODEL';
  return res.status(502).json({ error: `No image model is available for this key. Set ${envName} in Vercel.`, code: 'failed', provider });
}
