import { getApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, onSnapshot, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
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

// A Manager / Admin asks the Owner to delete a live product. The product stays on the shop until the Owner agrees.
export const requestProductDelete = (id, staff) =>
  updateDoc(doc(db, "products", String(id)), {
    deleteRequested: true,
    deleteRequestedBy: staff.email || "",
    deleteRequestedByName: staff.name || staff.email || "",
    deleteRequestedAt: new Date().toISOString(),
  });
// Owner says no: the product simply stays
export const rejectProductDelete = (id) =>
  updateDoc(doc(db, "products", String(id)), {
    deleteRequested: false,
    deleteRequestedBy: deleteField(),
    deleteRequestedByName: deleteField(),
    deleteRequestedAt: deleteField(),
  });

export const removeProduct = async (id) => {
  await deleteDoc(doc(db, "products", String(id)));
  // the private supplier details of this product go too (best effort)
  try { await deleteDoc(doc(db, "productCosts", String(id))); } catch (err) { /* nothing to remove, or not allowed */ }
};

// ---- Supplier details (dropshipping): PRIVATE ----
// Stored in their own collection "productCosts" (document id = product id), NOT inside the product, because products are
// public. Firestore rules let only team members (Owner / Manager / Admin) read or write it, so customers can never see it.
// Fields: supplierName (e.g. "SelfShop"), supplierCost (what the supplier charges you per piece), supplierLink (optional)
export function watchProductCosts(onData, onError) {
  return onSnapshot(
    collection(db, "productCosts"),
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      onData(map);
    },
    (err) => onError && onError(err)
  );
}
export const saveProductCost = (id, cost, staff) =>
  setDoc(doc(db, "productCosts", String(id)), clean({
    supplierName: String(cost.supplierName || "").trim().slice(0, 80),
    supplierCost: Number(cost.supplierCost) || 0,
    supplierLink: String(cost.supplierLink || "").trim().slice(0, 500),
    // optional: a different supplier link for each color, e.g. { White: "https://...", Red: "https://..." }
    colorLinks: Object.fromEntries(Object.entries(cost.colorLinks || {}).filter(([, u]) => u).map(([c, u]) => [String(c).slice(0, 40), String(u).trim().slice(0, 500)])),
    // optional: what the supplier charges for each color when the prices differ, e.g. { White: 1849, Red: 2750 }
    colorCosts: Object.fromEntries(Object.entries(cost.colorCosts || {}).filter(([, n]) => Number.isFinite(Number(n)) && Number(n) >= 0).map(([c, n]) => [String(c).slice(0, 40), Number(n)])),
    updatedAt: new Date().toISOString(),
    updatedBy: (staff && staff.email) || "",
  }));
export const removeProductCost = (id) => deleteDoc(doc(db, "productCosts", String(id)));

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
