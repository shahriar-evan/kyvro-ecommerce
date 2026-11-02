import { getApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

export const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const slugify = (s) => String(s || "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "shop";
const rand = () => Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, "x");

// A visitor opens kyvro.store/?shop=<slug>: read that shop (public). null = not found.
export function watchShop(slug, onData, onError) {
  return onSnapshot(
    doc(db, "shops", slug),
    (snap) => onData(snap.exists() ? { slug: snap.id, ...snap.data() } : null),
    (err) => onError && onError(err)
  );
}

// The shop of the signed-in team member (found by their account id, no email is stored in the public shop)
export function watchMyShop(uid, onData, onError) {
  return onSnapshot(
    query(collection(db, "shops"), where("ownerUid", "==", uid)),
    (snap) => onData(snap.docs.length ? { slug: snap.docs[0].id, ...snap.docs[0].data() } : null),
    (err) => onError && onError(err)
  );
}

// Owner: every shop
export function watchAllShops(onData, onError) {
  return onSnapshot(
    collection(db, "shops"),
    (snap) => onData(snap.docs.map((d) => ({ slug: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// slug -> { email, name } (private: the Owner reads all of them)
export function watchShopOwners(onData, onError) {
  return onSnapshot(
    collection(db, "shopOwners"),
    (snap) => { const m = {}; snap.docs.forEach((d) => { m[d.id] = d.data(); }); onData(m); },
    (err) => onError && onError(err)
  );
}

export async function createShop({ uid, email, name, ownerName }) {
  const shopName = String(name || "").trim().slice(0, 60);
  const slug = `${slugify(shopName)}-${rand()}`;
  await setDoc(doc(db, "shops", slug), {
    name: shopName,
    ownerUid: uid,
    active: true,
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "shopOwners", slug), { email: String(email || "").toLowerCase(), name: String(ownerName || "").slice(0, 80) });
  return slug;
}

export const saveShopItems = (slug, name, items) =>
  updateDoc(doc(db, "shops", slug), { name: String(name || "").trim().slice(0, 60), items, updatedAt: new Date().toISOString() });

// Owner only: switch a shop on / off
export const setShopActive = (slug, on) => updateDoc(doc(db, "shops", slug), { active: !!on });
