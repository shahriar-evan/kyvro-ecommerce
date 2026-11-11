import { getApp } from "firebase/app";
import { getFirestore, doc, collection, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import "./firebase";

// Home page showcase photos (background-free) uploaded from the Admin product form.
// Collection "showcase", document id = product id: { image (png/webp data URL), hanger, off, updatedAt, updatedBy }.
// "off" hides a built-in picture (src/data/cutouts.js) without uploading a new one. Rules: firestore.rules (showcase).
const db = getFirestore(getApp());

export async function loadShowcase() {
  const snap = await getDocs(collection(db, "showcase"));
  const out = {};
  snap.forEach((d) => { out[d.id] = d.data(); });
  return out;
}

export async function getShowcase(id) {
  const s = await getDoc(doc(db, "showcase", String(id)));
  return s.exists() ? s.data() : null;
}

// change = { image, hanger } to set a photo, { off: true } to hide the built-in one, { remove: true } to clear it all
export async function applyShowcaseChange(id, change, by = "") {
  if (!change) return;
  const ref = doc(db, "showcase", String(id));
  if (change.remove) { await deleteDoc(ref); return; }
  const data = { updatedAt: new Date().toISOString(), updatedBy: String(by).slice(0, 200) };
  if (change.off) data.off = true;
  else { data.image = change.image; data.hanger = !!change.hanger; }
  await setDoc(ref, data);
}

export const removeShowcase = (id) => deleteDoc(doc(db, "showcase", String(id)));
