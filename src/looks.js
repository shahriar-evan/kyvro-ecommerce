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
