import { getApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
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

// pending = an Admin's shop: it starts switched off until the Owner accepts it (the Owner gets a notification)
export async function createShop({ uid, email, name, ownerName, pending = false }) {
  const shopName = String(name || "").trim().slice(0, 60);
  const slug = `${slugify(shopName)}-${rand()}`;
  await setDoc(doc(db, "shops", slug), {
    name: shopName,
    ownerUid: uid,
    active: !pending,
    status: pending ? "pending" : "approved",
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "shopOwners", slug), { email: String(email || "").toLowerCase(), name: String(ownerName || "").slice(0, 80) });
  if (pending) {
    // phone notification + email to the Owner (best effort: the request also shows in the Owner's My Shop tab)
    try { await fetch("/api/shop-request-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }); } catch (err) { /* ignore */ }
  }
  return slug;
}

// a shop that waits for the Owner (older shops have no status: they were made by Managers and are approved)
export const isPendingShop = (s) => !!s && s.status === "pending";

// Owner: accept an Admin's shop request (it goes live) or reject it (the shop is removed)
export const acceptShop = (slug) => updateDoc(doc(db, "shops", slug), { status: "approved", active: true, updatedAt: new Date().toISOString() });
export async function rejectShop(slug) {
  await deleteDoc(doc(db, "shops", slug));
  try { await deleteDoc(doc(db, "shopOwners", slug)); } catch (err) { /* nothing stored */ }
}

// extra: { planExempt: true } for the Owner's own shop (no plan limit; the rules allow it only for the Owner)
export const saveShopItems = (slug, name, items, extra = {}) =>
  updateDoc(doc(db, "shops", slug), { name: String(name || "").trim().slice(0, 60), items, ...extra, updatedAt: new Date().toISOString() });

// Owner only: switch a shop on / off
export const setShopActive = (slug, on) => updateDoc(doc(db, "shops", slug), { active: !!on });
