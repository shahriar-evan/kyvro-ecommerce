// Vercel serverless function: the Owner sets an email + password login for a team member whose account was made with Google.
// It sets the password and removes the Google link, so the person logs in with email + password only. (Owner only.)
//
// Needs FIREBASE_SERVICE_ACCOUNT (already used by the other functions). That service account must be allowed to manage
// Firebase Authentication users (the default "firebase-adminsdk" account is).

import crypto from 'node:crypto';
import { FS, PROJECT, accessToken, val } from './_sslc.js';

export const config = { maxDuration: 20 };

const emailFromToken = (t) => {
  try { return String(JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')).email || '').toLowerCase(); } catch (e) { return ''; }
};

// access token that is also allowed to manage Authentication users
async function authAdminToken() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set in Vercel.');
  if (raw[0] !== '{') raw = Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(raw);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j.error_description || 'Could not log in to Firebase.');
  return j.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  try {
    const auth = req.headers.authorization || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const me = emailFromToken(idToken);
    if (!me) return res.status(401).json({ error: 'Please sign in.' });

    // the caller must be the Owner (Firestore checks the login token itself)
    const mine = await fetch(`${FS}/documents/admins/${encodeURIComponent(me)}`, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!mine.ok) return res.status(403).json({ error: 'Only the Owner can do this.' });
    const role = val(((await mine.json()).fields || {}).role);
    if (role !== 'owner') return res.status(403).json({ error: 'Only the Owner can do this.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Bad email.' });
    if (password.length < 6 || password.length > 100) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    // the person must be on the team
    const dsToken = await accessToken();
    const on = await fetch(`${FS}/documents/admins/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${dsToken}` } });
    if (!on.ok) return res.status(400).json({ error: 'This email is not on the team.' });

    const token = await authAdminToken();
    const base = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}`;
    const hdr = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const look = await fetch(`${base}/accounts:lookup`, { method: 'POST', headers: hdr, body: JSON.stringify({ email: [email] }) });
    const lj = await look.json().catch(() => ({}));
    if (!look.ok) return res.status(502).json({ error: (lj.error && lj.error.message) || 'Could not look up the login account (is the service account allowed to manage users?).' });
    const user = (lj.users || [])[0];
    if (!user) return res.status(404).json({ error: 'This email has no login account yet. Remove and add the person again with a password.' });

    const hadGoogle = (user.providerUserInfo || []).some((p) => p.providerId === 'google.com');
    const upd = await fetch(`${base}/accounts:update`, {
      method: 'POST', headers: hdr,
      body: JSON.stringify({ localId: user.localId, password, ...(hadGoogle ? { deleteProvider: ['google.com'] } : {}), validSince: String(Math.floor(Date.now() / 1000)) }),
    });
    const uj = await upd.json().catch(() => ({}));
    if (!upd.ok) return res.status(502).json({ error: (uj.error && uj.error.message) || 'Could not set the password.' });
    return res.status(200).json({ ok: true, googleRemoved: hadGoogle });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'failed' });
  }
}
