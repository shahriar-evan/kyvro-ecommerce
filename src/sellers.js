import { getApp } from "firebase/app";
import { getFirestore, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// ---- Public sellers ("Sell on Kyvro") ----
// A signed-in customer (not on the team) opens ONE shop. The shop is public (shops/{slug}, kind 'seller'); who owns it
// is private (sellers/{uid}: the seller and the Owner read it). Where the markup is paid (bKash) is in sellerPayout/{uid}:
// the seller writes it, only the Owner reads it. Sellers never see supplier data or customers' details.

export const DEFAULT_BLOCKED_WORDS = ["kyvro", "official", "admin", "owner", "support"];
const escapeRe = (w) => String(w).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// the regex the Firestore rules use (whole-text match, lower case); no words = nothing is blocked
export const blockedRegexFor = (words) => {
  const list = (words || []).map((w) => String(w || "").trim().toLowerCase()).filter(Boolean);
  return list.length ? `.*(${list.map(escapeRe).join("|")}).*` : "^$";
};
export const normalizeSellerRules = (r) => {
  const words = Array.isArray(r && r.blockedWords) ? r.blockedWords.map((w) => String(w || "").trim().toLowerCase()).filter(Boolean).slice(0, 100) : DEFAULT_BLOCKED_WORDS;
  return { open: !r || r.open !== false, blockedWords: words };
};
// the same check as firestore.rules, so the seller sees a clear message first
export const sellerNameBlocked = (name, slug, rules) => {
  const words = normalizeSellerRules(rules).blockedWords;
  const n = String(name || "").toLowerCase();
  return words.find((w) => n.includes(w) || String(slug || "").includes(w)) || "";
};

export function watchSellerRules(onData) {
  return onSnapshot(doc(db, "settings", "sellerRules"), (snap) => onData(normalizeSellerRules(snap.exists() ? snap.data() : null)), () => onData(normalizeSellerRules(null)));
}
export async function saveSellerRules(rules, staff) {
  const r = normalizeSellerRules(rules);
  await setDoc(doc(db, "settings", "sellerRules"), {
    open: r.open,
    blockedWords: r.blockedWords,
    blockedRegex: blockedRegexFor(r.blockedWords),
    updatedAt: serverTimestamp(),
    updatedByName: (staff && (staff.name || staff.email)) || "",
  });
}

// my seller entry (null = I have no shop yet)
export function watchMySeller(uid, onData) {
  if (!uid) { onData(null); return () => {}; }
  return onSnapshot(doc(db, "sellers", uid), (snap) => onData(snap.exists() ? { uid, ...snap.data() } : null), () => onData(null));
}

const slugify = (s) => String(s || "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "shop";
const rand = () => Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, "x");
// one batch: the shop and my seller entry (the rules allow it only once per account)
export async function createSellerShop({ uid, email, name, sellerName }) {
  const shopName = String(name || "").trim().slice(0, 60);
  const slug = `${slugify(shopName)}-${rand()}`;
  const b = writeBatch(db);
  b.set(doc(db, "shops", slug), {
    name: shopName,
    ownerUid: uid,
    kind: "seller",
    active: true,
    status: "approved",
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  });
  b.set(doc(db, "sellers", uid), {
    slug,
    email: String(email || "").toLowerCase(),
    name: String(sellerName || "").slice(0, 80),
    createdAt: serverTimestamp(),
  });
  await b.commit();
  return slug;
}

// where my markup is paid (the seller cannot read it back, only the Owner)
export const saveSellerBkash = (uid, bkash) =>
  setDoc(doc(db, "sellerPayout", uid), { bkash: String(bkash || "").replace(/\D/g, ""), updatedAt: new Date().toISOString() });

// my markup per order, from the server (no customer names, phones or addresses)
export async function loadSellerEarnings(user) {
  const t = await user.getIdToken();
  const r = await fetch("/api/plan?action=seller-earnings", { method: "POST", headers: { Authorization: `Bearer ${t}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Could not load your earnings.");
  return j;
}

// ---- Owner ----
export function watchSellers(onData, onError) {
  return onSnapshot(collection(db, "sellers"), (snap) => onData(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))), (err) => onError && onError(err));
}
export function watchSellerPayouts(onData) {
  return onSnapshot(collection(db, "sellerPayout"), (snap) => { const m = {}; snap.docs.forEach((d) => { m[d.id] = d.data(); }); onData(m); }, () => onData({}));
}
export function watchSubscriptions(onData) {
  return onSnapshot(collection(db, "subscriptions"), (snap) => { const m = {}; snap.docs.forEach((d) => { m[d.id] = d.data(); }); onData(m); }, () => onData({}));
}
// kill switch: the shop goes off and the seller can never switch it on again (only the Owner can revive it)
export const killSellerShop = (slug, note) => updateDoc(doc(db, "shops", slug), { active: false, killed: true, killNote: String(note || "").slice(0, 200), updatedAt: new Date().toISOString() });
export const reviveSellerShop = (slug) => updateDoc(doc(db, "shops", slug), { active: true, killed: false, killNote: "", updatedAt: new Date().toISOString() });
// remove a seller completely (shop + entry), so the account could open a new shop later
export async function removeSeller(seller) {
  if (seller.slug) await deleteDoc(doc(db, "shops", seller.slug));
  await deleteDoc(doc(db, "sellers", seller.uid));
  try { await deleteDoc(doc(db, "sellerPayout", seller.uid)); } catch (e) { /* nothing saved */ }
}
