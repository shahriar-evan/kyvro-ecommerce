// Client side of the supplier stock sync (server: api/_plan/stock.js, /api/plan?action=stock)
import { auth } from './firebase';

export async function callStock(op, id) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const r = await fetch('/api/plan?action=stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ op, ...(id ? { id: String(id) } : {}) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
  return j;
}

// colours the supplier has run out of ('*' = whole product) and colours waiting for approval
export const outColours = (p) => Object.keys((p && p.supplierOut) || {}).filter((c) => p.supplierOut[c] === true);
export const backColours = (p) => Object.keys((p && p.backInStock) || {}).filter((c) => p.backInStock[c] === true);
export const colourLabel = (c) => (c === '*' ? 'whole product' : c);
