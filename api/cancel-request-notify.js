// Vercel serverless function: sends the phone / browser notification to the Owner(s) when a Manager or Admin
// asks to cancel a PAID order (the request itself is saved on the order by the website, protected by Firestore rules).
//
// Safe to call without a login: the text always comes from the saved order (never from the caller), it only
// notifies for an order that really has a waiting request, and only once per request.
//
// Environment variables (already used by the other functions): FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID (optional), SITE_URL (optional)
// Optional: OWNER_EMAILS  comma separated, extra owner emails (the fixed owner shahriarevan545@gmail.com is always included)

import { PROJECT, SITE, FS, accessToken, getOrder, val } from './_sslc.js';

export const config = { maxDuration: 20 };

const FIXED_OWNERS = ['shahriarevan545@gmail.com'];

async function ownerEmails(token) {
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

async function pushTokens(token, owners) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const orderNumber = String(body.orderNumber || '');
    const order = await getOrder(orderNumber);
    const cr = order && order.cancelRequest;
    if (!cr || cr.status !== 'pending') return res.status(200).json({ sent: 0, reason: 'no waiting request' });
    if (cr.notified) return res.status(200).json({ sent: 0, reason: 'already notified' });

    const token = await accessToken();
    // remember that the Owner was notified (before sending, so a double click cannot notify twice)
    const mark = await fetch(`${FS}/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{
        update: { name: `projects/${PROJECT}/databases/(default)/documents/orders/${orderNumber}`, fields: { cancelRequest: { mapValue: { fields: { notified: { booleanValue: true } } } } } },
        updateMask: { fieldPaths: ['cancelRequest.notified'] },
        currentDocument: { exists: true },
      }] }),
    });
    if (!mark.ok) return res.status(200).json({ sent: 0, reason: 'could not mark' });

    const owners = await ownerEmails(token);
    const tokens = await pushTokens(token, owners);
    if (!tokens.length) return res.status(200).json({ sent: 0, reason: 'owner has not allowed notifications' });

    const title = `Cancel request: ${orderNumber}`;
    const text = `${cr.byName || 'A team member'} wants to cancel this PAID order: ${String(cr.reason || '').slice(0, 120)}`;
    let sent = 0;
    await Promise.all(tokens.map(async (t) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: {
          token: t,
          data: { title, body: text, link: SITE, icon: `${SITE}/kyvro-icon.png` },
          webpush: { headers: { Urgency: 'high', TTL: '86400' } },
        } }),
      });
      if (r.ok) sent += 1;
    }));
    return res.status(200).json({ sent, total: tokens.length });
  } catch (err) {
    return res.status(200).json({ sent: 0, error: err.message || 'failed' });
  }
}
