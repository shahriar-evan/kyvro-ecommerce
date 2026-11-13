import { getApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// Shop the Look (home page, between the Men's and Women's rails): looks/{id} = { name, who ('men' | 'women'),
// image (transparent full-body model picture, data URL ≤ 450 KB), items [{ id (product id), x, y (pin, % of the picture) }] (1-4),
// order, active, updatedAt, updatedByName }. Public read; the Owner / a Manager write (Admin → Shop the Look).
export const LOOK_MAX_ITEMS = 4;
export const LOOK_MAX = 12;

export function watchLooks(onData) {
  return onSnapshot(
    collection(db, "looks"),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)))),
    () => onData([])
  );
}

export async function saveLook(look, staff) {
  const id = look.id || `look-${Date.now()}`;
  await setDoc(doc(db, "looks", id), {
    name: String(look.name || "").trim().slice(0, 40),
    who: look.who === "women" ? "women" : "men",
    image: look.image,
    items: (look.items || []).slice(0, LOOK_MAX_ITEMS).map((it) => ({
      id: String(it.id),
      x: Math.max(0, Math.min(100, Math.round(Number(it.x) || 50))),
      y: Math.max(0, Math.min(100, Math.round(Number(it.y) || 50))),
    })),
    order: Math.max(0, Math.min(999, parseInt(look.order, 10) || 0)),
    active: look.active !== false,
    updatedAt: serverTimestamp(),
    updatedByName: (staff && (staff.name || staff.email)) || "",
  });
  return id;
}

export const deleteLook = (id) => deleteDoc(doc(db, "looks", id));

// ---- Colour try-on (customers): a saved look's model in another colour of one of its products ----
// lookColors/{look_product_colour} = a picture made earlier (public, free to show); a new one is made by the server
// (api/plan.js?action=ai-photo view 'look-color', signed in, 10 a day per account).
export const lookColorKey = (lookId, productId, color) => `v2_${lookId}_${productId}_${String(color || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
export async function getLookColor(lookId, productId, color) {
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "lookColors", lookColorKey(lookId, productId, color)));
    return snap.exists() ? snap.data().image || null : null;
  } catch (e) { return null; }
}
export async function tryLookColor(lookId, productId, color) {
  const { auth } = await import("./firebase");
  const user = auth.currentUser;
  const headers = { "Content-Type": "application/json" };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const r = await fetch("/api/plan?action=ai-photo", { method: "POST", headers, body: JSON.stringify({ view: "look-color", lookId, productId, color }) });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (!r.ok || !j.image) { const e = new Error(j.error || (r.status === 504 ? "That took too long. Please try again." : "Could not change the colour.")); e.code = j.code || ""; throw e; }
  return j;
}
