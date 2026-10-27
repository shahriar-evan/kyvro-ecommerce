// Vercel serverless function behind the "Unsubscribe" link of every offer email.
// The link holds the person's secret code; Firestore rules accept the change only when that code is right.

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'kyvro-admin-auth';
const SITE = (process.env.SITE_URL || 'https://kyvro.store').replace(/\/$/, '');
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const page = (title, text) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;color:#222"><div style="max-width:480px;margin:60px auto;background:#fff;padding:32px;border-radius:8px;text-align:center">
<div style="color:#D4AF37;font-size:22px;letter-spacing:4px;font-weight:bold">KYVRO</div><h2>${title}</h2><p style="line-height:1.6">${text}</p>
<p><a href="${SITE}" style="color:#000">Back to kyvro.store</a></p></div></body></html>`;

export default async function handler(req, res) {
  const email = String((req.query && req.query.e) || '').trim().toLowerCase();
  const token = String((req.query && req.query.t) || '').trim();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!email || !token || email.length > 200 || token.length > 100) return res.status(400).send(page('Invalid link', 'This unsubscribe link is not valid.'));
  try {
    const url = `${FS}/subscribers/${encodeURIComponent(email)}?updateMask.fieldPaths=unsubscribed&updateMask.fieldPaths=unsubscribedAt&updateMask.fieldPaths=unsubWith&currentDocument.exists=true`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        unsubscribed: { booleanValue: true },
        unsubscribedAt: { timestampValue: new Date().toISOString() },
        unsubWith: { stringValue: token },
      } }),
    });
    if (r.ok) {
      if (req.method === 'POST') return res.status(200).send('ok');
      return res.status(200).send(page('You are unsubscribed', 'You will not get offer emails from Kyvro any more. You can turn them back on any time in your account settings on kyvro.store.'));
    }
    return res.status(400).send(page('Invalid link', 'This unsubscribe link is not valid or has expired.'));
  } catch (e) {
    return res.status(500).send(page('Something went wrong', 'Please try again in a moment, or write to kyvrofashion@gmail.com.'));
  }
}
