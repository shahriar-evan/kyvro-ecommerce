// Vercel serverless function: sends the offer EMAIL and the phone/browser NOTIFICATION to every subscribed customer (Owner only).
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY            API key from resend.com
//   MAIL_FROM                 e.g.  Kyvro <offers@kyvro.store>   (the domain must be verified in Resend)
//   FIREBASE_SERVICE_ACCOUNT  the whole JSON of a Firebase service account key (for the notifications)
//   FIREBASE_PROJECT_ID       optional, default kyvro-admin-auth
//   SITE_URL                  optional, default https://kyvro.store

import crypto from 'node:crypto';

export const config = { maxDuration: 30 };

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

// ---------- Phone / browser notifications (Firebase Cloud Messaging) ----------
async function listPushTokens(idToken) {
  const out = [];
  let pageToken = '';
  do {
    const url = `${FS}/pushTokens?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!r.ok) throw new Error('Could not read the notification list.');
    const j = await r.json();
    for (const d of j.documents || []) {
      const f = d.fields || {};
      const token = f.token && f.token.stringValue;
      if (token) out.push({ token, email: ((f.email && f.email.stringValue) || '').toLowerCase() });
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

function readServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) return null;
  raw = raw.trim();
  if (raw[0] !== '{') raw = Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

async function fcmAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || 'Could not log in to Firebase.');
  return j.access_token;
}

// Returns { pushSent, pushFailed, pushTotal } or { pushError }
async function sendPush(idToken, { title, text, onlyEmail, link }) {
  let sa;
  try { sa = readServiceAccount(); } catch (e) { return { pushError: 'FIREBASE_SERVICE_ACCOUNT is not valid JSON.' }; }
  if (!sa || !sa.client_email || !sa.private_key) return { pushError: 'Notifications are not set up yet (add FIREBASE_SERVICE_ACCOUNT in Vercel).' };
  try {
    let tokens = await listPushTokens(idToken);
    if (onlyEmail) tokens = tokens.filter((t) => t.email === onlyEmail);
    if (!tokens.length) return { pushSent: 0, pushFailed: 0, pushTotal: 0 };
    const access = await fcmAccessToken(sa);
    const project = sa.project_id || PROJECT;
    let pushSent = 0;
    let pushFailed = 0;
    let lastError = '';
    for (let i = 0; i < tokens.length; i += 20) {
      await Promise.all(tokens.slice(i, i + 20).map(async (t) => {
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: {
            token: t.token,
            data: { title, body: text, link: link || SITE, icon: `${SITE}/kyvro-icon.png` },
            webpush: { headers: { Urgency: 'high', TTL: '86400' } },
          } }),
        });
        if (r.ok) { pushSent += 1; return; }
        pushFailed += 1;
        let j = {};
        try { j = await r.json(); } catch (e) { /* ignore */ }
        lastError = (j.error && j.error.message) || lastError;
        // The device is gone (app removed / permission withdrawn): remove it from the list
        if (r.status === 404 || (j.error && j.error.status === 'NOT_FOUND')) {
          await fetch(`${FS}/pushTokens/${encodeURIComponent(t.token)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${idToken}` } }).catch(() => {});
        }
      }));
    }
    return { pushSent, pushFailed, pushTotal: tokens.length, ...(pushSent === 0 && lastError ? { pushError: lastError } : {}) };
  } catch (e) {
    return { pushError: e.message || 'Notification sending failed.' };
  }
}

const emailFromToken = (idToken) => {
  try { return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).email || ''; } catch (e) { return ''; }
};

function buildMail(subject, message, sub, link, hasProduct) {
  const unsub = `${SITE}/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${encodeURIComponent(sub.token)}`;
  const paragraphs = String(message).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#111;padding:20px;text-align:center"><span style="color:#D4AF37;font-size:22px;letter-spacing:4px;font-weight:bold">KYVRO</span><div style="color:#bbb;font-size:11px;letter-spacing:3px;margin-top:4px">কাইভ্রো &bull; WEAR YOUR STORY</div></div>
  <div style="padding:26px 24px">${sub.name ? `<p style="margin:0 0 14px">Hi ${esc(sub.name.split(' ')[0])},</p>` : ''}${paragraphs}
    <p style="text-align:center;margin:26px 0"><a href="${link}" style="background:#D4AF37;color:#000;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:4px;letter-spacing:2px;font-size:13px">${hasProduct ? 'VIEW THIS PRODUCT' : 'SHOP NOW'}</a></p>
  </div>
  <div style="padding:16px 24px;background:#fafafa;color:#888;font-size:11px;text-align:center;line-height:1.6">
    You get this email because you signed in to kyvro.store.<br>
    Questions? kyvrofashion@gmail.com &nbsp;|&nbsp; <a href="${unsub}" style="color:#888">Unsubscribe</a>
  </div>
</div></body></html>`;
  const text = `${sub.name ? `Hi ${sub.name.split(' ')[0]},\n\n` : ''}${message}\n\n${hasProduct ? 'See it here' : 'Shop now'}: ${link}\n\nUnsubscribe: ${unsub}`;
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

    // Offer for one product: the email button and the notification open that product page on the website
    const pid = /^[A-Za-z0-9_-]{1,60}$/.test(String(body.productId || '')) ? String(body.productId) : '';
    const link = pid ? `${SITE}/?product=${encodeURIComponent(pid)}` : SITE;

    let sent = 0;
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < targets.length; i += 100) {
      const chunk = targets.slice(i, i + 100).map((s) => buildMail(body.testOnly ? `[TEST] ${subject}` : subject, message, s, link, !!pid));
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (r.ok) { sent += chunk.length; continue; }
      try { const j = await r.json(); lastError = j.message || j.error || ''; } catch (e) { /* ignore */ }
      // One bad address makes the whole batch fail, so retry this group one by one and skip only the bad ones
      for (const mail of chunk) {
        const one = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(mail),
        });
        if (one.ok) sent += 1;
        else {
          failed += 1;
          try { const j = await one.json(); lastError = j.message || j.error || lastError; } catch (e) { /* ignore */ }
        }
      }
    }
    // Notification (phone / browser). Same click, same text.
    let push = { pushSent: 0, pushFailed: 0, pushTotal: 0 };
    if (body.push !== false) {
      const pushTitle = String(body.pushTitle || subject).trim().slice(0, 80) || 'Kyvro';
      const pushText = String(body.pushBody || message).trim().slice(0, 180);
      push = await sendPush(idToken, {
        title: body.testOnly ? `[TEST] ${pushTitle}` : pushTitle,
        text: pushText,
        onlyEmail: body.testOnly ? emailFromToken(idToken).toLowerCase() : '',
        link,
      });
    }

    if (targets.length > 0 && sent === 0 && !(push.pushSent > 0)) {
      return res.status(502).json({ error: `The email service refused the message. ${lastError}`.trim() });
    }
    return res.status(200).json({ sent, failed, total: targets.length, ...push });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
  }
}
