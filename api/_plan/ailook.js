// POST /api/plan?action=ai-photo with { view: 'look', sources: [2-4 product photos], who: 'men' | 'women' }  (Owner / Manager)
// "Shop the Look" (home page): one standing model wearing exactly these products, full body, on a TRANSPARENT background,
// made with OpenAI image editing (gpt-image, several input pictures at once). Nothing is saved here: the Admin page shows
// the picture and the team member saves the look (looks/{id}) if it is right.
//
// Environment: OPENAI_API_KEY (platform.openai.com, prepaid credit). Optional OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY
// (low | medium | high, default medium; the Admin can ask for 'high' = Premium). Counted in the same aiUsage/{day} as the other AI photos.
const OPENAI_EDITS = 'https://api.openai.com/v1/images/edits';
const models = () => [...new Set([process.env.OPENAI_IMAGE_MODEL, 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'].filter(Boolean))];
const quality = (q) => (['medium', 'high'].includes(q) ? q : ['low', 'medium', 'high'].includes(process.env.OPENAI_IMAGE_QUALITY) ? process.env.OPENAI_IMAGE_QUALITY : 'medium');

// a different person and pose each time (the Admin sends a number), so several looks do not look like one model
const MEN = ['short neat black hair, light stubble', 'textured medium black hair, clean shaven', 'short fade haircut, trimmed beard', 'wavy dark hair, clean shaven'];
const WOMEN = ['long straight black hair', 'shoulder-length wavy dark hair', 'hair in a neat low bun', 'long loose curls'];
const POSES = ['standing relaxed, one hand in a pocket', 'standing straight, arms relaxed at the sides', 'mid-step walking pose toward the camera', 'standing with weight on one leg, slight three-quarter turn'];
const lookPrompt = (who, n, v = 0) => {
  const person = who === 'women' ? `a young South Asian woman in her twenties, ${WOMEN[v % 4]}` : `a young South Asian man in his twenties, ${MEN[v % 4]}`;
  return `High-end fashion lookbook photograph of ${person}, ${POSES[Math.floor(v / 4) % 4]}, full body from head to shoes, centred, `
  + 'with some empty space above the head and below the feet. Shot on a full-frame camera with an 85mm lens at eye level, soft diffused studio key light '
  + 'with gentle fill, natural realistic shadows on the body and clothes. A real human: natural realistic face with true-to-life skin texture and pores, '
  + 'natural eyes and expression, realistic hair, correct hands with five fingers, natural body proportions. Calm confident expression, looking at the camera. '
  + `The person wears EXACTLY the ${n} items shown in the ${n} input pictures, all together as one outfit, with a natural fit and realistic fabric folds and drape: `
  + 'keep each item\'s exact colour, shade, fabric texture, pattern, print, stitching, buttons, zips, collar and pockets. Do not change, add, translate or invent '
  + 'any text, letters, numbers, logos or brand names. No other clothing, bag, hat, glasses, jewellery or accessory that is not in the pictures '
  + '(if no trousers or shoes are given, use plain simple neutral ones). '
  + 'Fully TRANSPARENT background: no floor, no wall, no shadow on the ground, no props, no text, no watermark. Ultra sharp, premium e-commerce campaign quality.';
};

function toBlob(src) {
  const buf = Buffer.from(src.data, 'base64');
  return new Blob([buf], { type: src.mime });
}

// { image } / { next } / { error, code }
async function callOpenAI(key, model, sources, prompt, q) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  sources.forEach((s, i) => form.append('image[]', toBlob(s), `item${i + 1}.${s.mime.split('/')[1].replace('jpeg', 'jpg')}`));
  form.append('size', '1024x1536');
  form.append('background', 'transparent');
  form.append('output_format', 'png');
  form.append('quality', quality(q));
  form.append('n', '1');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 280000); // Premium (high) can take 1-3 minutes
  try {
    const r = await fetch(OPENAI_EDITS, { method: 'POST', signal: ctrl.signal, headers: { Authorization: `Bearer ${key}` }, body: form });
    let j = {};
    try { j = await r.json(); } catch (e) { /* not json */ }
    const msg = String((j.error && j.error.message) || '');
    if (r.ok) {
      const b64 = ((j.data || [])[0] || {}).b64_json;
      if (!b64) return { error: 'OpenAI did not send a picture back. Try again or use other photos.', code: 'no-image' };
      return { image: `data:image/png;base64,${b64}` };
    }
    if (/model/i.test(msg) && (r.status === 404 || /does not exist|not found|invalid model|not supported|unknown/i.test(msg))) return { next: true };
    if (/verif/i.test(msg)) return { error: 'OpenAI asks you to verify your organization before it makes pictures: platform.openai.com/settings/organization/general → Verify Organization.', code: 'verify' };
    if (r.status === 429 && /quota|billing|credit/i.test(msg)) return { error: 'Your OpenAI credit is finished.', code: 'no-credit' };
    if (r.status === 401) return { error: 'The OpenAI API key is not valid.', code: 'bad-key' };
    if (r.status === 400 && /safety|moderation|rejected/i.test(msg)) return { error: 'OpenAI refused these photos. Try other products or photos.', code: 'no-image' };
    if (r.status === 429) return { error: 'Too many AI requests right now. Wait a minute and try again.', code: 'failed' };
    return { error: `OpenAI could not make the picture (${r.status}). Try again.`, code: 'failed' };
  } catch (e) {
    return { error: 'OpenAI took too long. Try again (a look with fewer products is faster).', code: 'failed' };
  } finally { clearTimeout(t); }
}

// readSource / usage come from aiphoto.js (shared), so the limits and photo checks stay the same
export async function makeLook(req, res, { body, readSource, token, day, usage }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Shop the Look pictures need OPENAI_API_KEY in Vercel (Production).', code: 'no-key', provider: 'openai' });
  const list = (Array.isArray(body.sources) ? body.sources : []).slice(0, 4);
  if (list.length < 1) return res.status(400).json({ error: 'Pick at least 2 products.', code: 'bad-source' });
  const sources = [];
  for (const s of list) {
    const src = await readSource(s);
    if (!src) return res.status(400).json({ error: 'A product photo could not be opened. Use JPG / PNG / WebP photos.', code: 'bad-source' });
    sources.push(src);
  }
  const prompt = lookPrompt(body.who === 'women' ? 'women' : 'men', sources.length, Math.max(0, parseInt(body.variant, 10) || 0));
  for (const model of models()) {
    const out = await callOpenAI(key, model, sources, prompt, body.quality);
    if (out.next) continue;
    if (out.error) return res.status(out.code === 'no-credit' ? 402 : 502).json({ error: out.error, code: out.code, provider: 'openai' });
    await usage(token, day, 1);
    return res.status(200).json({ image: out.image, model, provider: 'openai' });
  }
  return res.status(502).json({ error: 'No OpenAI image model is available for this key. Set OPENAI_IMAGE_MODEL in Vercel.', code: 'failed', provider: 'openai' });
}
