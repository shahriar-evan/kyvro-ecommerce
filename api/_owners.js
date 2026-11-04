// Shared helpers to reach the Owner(s): their emails, their phone / browser notification tokens, and sending to them.
// Files starting with "_" are not public endpoints.
//
// Environment variables: FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID (optional), SITE_URL (optional)
// Optional: OWNER_EMAILS  comma separated, extra owner emails (the fixed owner shahriarevan545@gmail.com is always included)
// Email (optional): RESEND_API_KEY, MAIL_FROM

import { PROJECT, SITE, FS, val } from './_sslc.js';

const FIXED_OWNERS = ['shahriarevan545@gmail.com'];

export async function ownerEmails(token) {
  const set = new Set(FIXED_OWNERS);
  String(process.env.OWNER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).forEach((e) => set.add(e));
  try {
    const r = await fetch(`${FS}/documents/admins?pageSize=300`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const j = await r.json();
      for (const d of j.documents || []) {
        const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
        const email = decodeURIComponent(String(d.name || '').split('/').pop() || '').toLowerCase();
        if (email && f.role === 'owner' && f.active !== false) set.add(email);
      }
    }
  } catch (e) { /* the fixed owner is enough */ }
  return set;
}

export async function pushTokens(token, owners) {
  const out = [];
  let pageToken = '';
  do {
    const r = await fetch(`${FS}/documents/pushTokens?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) break;
    const j = await r.json();
    for (const d of j.documents || []) {
      const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
      if (f.token && owners.has(String(f.email || '').toLowerCase())) out.push(f.token);
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Phone / browser notification to every device of the Owner(s). Returns how many were sent.
export async function pushToOwners(token, owners, title, text, link = SITE) {
  const tokens = await pushTokens(token, owners);
  let sent = 0;
  await Promise.all(tokens.map(async (t) => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: {
        token: t,
        data: { title, body: text, link, icon: `${SITE}/kyvro-icon.png` },
        webpush: { headers: { Urgency: 'high', TTL: '86400' } },
      } }),
    });
    if (r.ok) sent += 1;
  }));
  return sent;
}

// Email to the Owner(s) through Resend (skipped when email is not set up). Returns true when it was accepted.
export async function emailOwners(owners, subject, html, text) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [...owners], subject, html, text }),
  });
  return r.ok;
}
