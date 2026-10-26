import { getApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { imageFileToDataURL } from "./utils/imageUpload";

const db = getFirestore(getApp());

// Products live in Firestore (collection "products"), so every customer on every device sees the same shop.
// onData(list, isEmpty) is called live whenever anything changes.
// Team members see every product (including "pending" ones). Customers only get approved products:
// the query itself is filtered, because Firestore rules do not filter results for you.
export function watchProducts(onData, onError, { all = false } = {}) {
  const source = all ? collection(db, "products") : query(collection(db, "products"), where("status", "==", "approved"));
  return onSnapshot(
    source,
    (snap) => onData(snap.docs.map((d) => d.data()).sort((a, b) => Number(b.id) - Number(a.id)), snap.empty),
    (err) => onError && onError(err)
  );
}

// Firestore does not accept "undefined" values, so strip them
const clean = (p) => JSON.parse(JSON.stringify(p));

export const saveProduct = (product) => setDoc(doc(db, "products", String(product.id)), clean(product));
// Owner or Manager approves a product that an Admin added, so customers can see it
export const approveProduct = (product, staff) =>
  saveProduct({ ...product, status: "approved", approvedBy: staff.email || "", approvedByName: staff.name || staff.email || "", approvedAt: new Date().toISOString() });

export const removeProduct = (id) => deleteDoc(doc(db, "products", String(id)));

// Makes sure an image can be stored inside the product document (a small data URL or a normal web link)
async function storableImage(src, fallback) {
  if (typeof src === "string" && (src.startsWith("data:") || /^https?:\/\/(?!localhost)/.test(src))) return src;
  for (const candidate of [src, fallback]) {
    if (!candidate) continue;
    try {
      const res = await fetch(candidate);
      const blob = await res.blob();
      return await imageFileToDataURL(new File([blob], "p", { type: blob.type }), { maxSize: 900, quality: 0.8 });
    } catch (err) { /* try the next one */ }
  }
  return "";
}

// One-time move of the products from this browser to Firestore (Owner only).
// fallbackById: the original built-in products, used when an old saved photo path no longer works.
export async function migrateProducts(list, fallbackById = {}) {
  let missingPhotos = 0;
  for (const p of list) {
    const image = await storableImage(p.image, fallbackById[p.id] && fallbackById[p.id].image);
    if (!image) missingPhotos++;
    await saveProduct({ ...p, status: "approved", image, images: [image] });
  }
  return { count: list.length, missingPhotos };
}
