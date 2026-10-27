// Vercel serverless function: sends the offer email to every subscribed customer (Owner only).
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY      API key from resend.com
//   MAIL_FROM           e.g.  Kyvro <offers@kyvro.store>   (the domain must be verified in Resend)
//   FIREBASE_PROJECT_ID optional, default kyvro-admin-auth
//   SITE_URL            optional, default https://kyvro.store

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'kyvro-admin-auth';
const SITE = (process.env.SITE_URL || 'https://kyvro.store').replace(/\/$/, '');
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Reads the subscribers with the Owner's own login token. Firestore rules only allow the Owner to list them,
// so a successful read also proves that the caller is the Owner.
async function listSubscribers(idToken) {
  const out = [];
  let pageToken = '';
  do {
    const url = `${FS}/subscribers?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (r.status === 401 || r.status === 403) { const e = new Error('Only the Owner can send offer emails.'); e.status = 403; throw e; }
    if (!r.ok) { const e = new Error('Could not read the subscriber list.'); e.status = 502; throw e; }
    const j = await r.json();
    for (const d of j.documents || []) {
      const f = d.fields || {};
      out.push({
        email: f.email && f.email.stringValue,
        name: (f.name && f.name.stringValue) || '',
        token: f.token && f.token.stringValue,
        unsubscribed: !!(f.unsubscribed && f.unsubscribed.booleanValue),
      });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

const emailFromToken = (idToken) => {
  try { return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).email || ''; } catch (e) { return ''; }
};

function buildMail(subject, message, sub) {
  const unsub = `${SITE}/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${encodeURIComponent(sub.token)}`;
  const paragraphs = String(message).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#111;padding:20px;text-align:center"><span style="color:#D4AF37;font-size:22px;letter-spacing:4px;font-weight:bold">KYVRO</span><div style="color:#bbb;font-size:11px;letter-spacing:3px;margin-top:4px">কাইভ্রো &bull; WEAR YOUR STORY</div></div>
  <div style="padding:26px 24px">${sub.name ? `<p style="margin:0 0 14px">Hi ${esc(sub.name.split(' ')[0])},</p>` : ''}${paragraphs}
    <p style="text-align:center;margin:26px 0"><a href="${SITE}" style="background:#D4AF37;color:#000;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:4px;letter-spacing:2px;font-size:13px">SHOP NOW</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center;line-height:1.6">
    You get this email because you signed in to kyvro.store.<br>
    Questions? kyvrofashion@gmail.com &nbsp;|&nbsp; <a href="${unsub}" style="color:#888">Unsubscribe</a>
  </div>
</div></body></html>`;
  const text = `${sub.name ? `Hi ${sub.name.split(' ')[0]},\n\n` : ''}${message}\n\nShop now: ${SITE}\n\nUnsubscribe: ${unsub}`;
  return {
    from: process.env.MAIL_FROM,
    to: [sub.email],
    subject,
    html,
    text,
    headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  try {
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
      return res.status(500).json({ error: 'Email is not set up yet: add RESEND_API_KEY and MAIL_FROM in the Vercel environment variables, then redeploy.' });
    }
    const auth = req.headers.authorization || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'Please sign in.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const subject = String(body.subject || '').trim().slice(0, 150);
    const message = String(body.message || '').trim().slice(0, 4000);
    if (subject.length < 3 || message.length < 10) return res.status(400).json({ error: 'Write a subject and a message first.' });

    const all = await listSubscribers(idToken); // also proves the caller is the Owner
    let targets;
    if (body.testOnly) {
      const me = emailFromToken(idToken);
      if (!me) return res.status(400).json({ error: 'Could not find your email.' });
      const mine = all.find((s) => s.email === me.toLowerCase());
      targets = [{ email: me, name: (mine && mine.name) || '', token: (mine && mine.token) || 'test' }];
    } else {
      targets = all.filter((s) => s.email && s.token && !s.unsubscribed);
    }
    if (!targets.length) return res.status(200).json({ sent: 0, failed: 0, total: 0 });

    let sent = 0;
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < targets.length; i += 100) {
      const chunk = targets.slice(i, i + 100).map((s) => buildMail(body.testOnly ? `[TEST] ${subject}` : subject, message, s));
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (r.ok) sent += chunk.length;
      else {
        failed += chunk.length;
        try { const j = await r.json(); lastError = j.message || j.error || ''; } catch (e) { /* ignore */ }
      }
    }
    if (sent === 0) return res.status(502).json({ error: `The email service refused the message. ${lastError}`.trim() });
    return res.status(200).json({ sent, failed, total: targets.length });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
  }
}
