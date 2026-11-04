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
// a seller's status: entries from before approvals have none and count as approved
export const sellerStatus = (seller) => (!seller ? "" : seller.status || "approved");

// WhatsApp: a Bangladeshi mobile (01XXXXXXXXX or +8801XXXXXXXXX) or an international number (+...). Same check as the rules.
export const normalizeWhatsapp = (v) => {
  const t = String(v || "").replace(/[\s()-]/g, "");
  return /^(\+?8801[3-9][0-9]{8}|01[3-9][0-9]{8}|\+[1-9][0-9]{7,14})$/.test(t) ? t : "";
};

// Apply to sell: one batch writes the shop (OFF, 'pending') and the application (sellers/{uid}, 'pending').
// The rules allow it once per account, and again only after the Owner rejected the last application.
export async function applyAsSeller({ uid, email, shopName, details }) {
  const name = String(shopName || "").trim().slice(0, 60);
  const slug = `${slugify(name)}-${rand()}`;
  const b = writeBatch(db);
  b.set(doc(db, "shops", slug), {
    name,
    ownerUid: uid,
    kind: "seller",
    active: false,
    status: "pending",
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  });
  b.set(doc(db, "sellers", uid), {
    slug,
    email: String(email || "").toLowerCase(),
    name: String(details.name || "").trim().slice(0, 80),
    whatsapp: normalizeWhatsapp(details.whatsapp),
    district: String(details.district || "").trim().slice(0, 40),
    area: String(details.area || "").trim().slice(0, 60),
    address: String(details.address || "").trim().slice(0, 300),
    pageLink: String(details.pageLink || "").trim().slice(0, 300),
    productNote: String(details.productNote || "").trim().slice(0, 300),
    agreed: details.agreed === true,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  await b.commit();
  // phone notification + email to the Owner (best effort; the application also shows in the Owner's Sellers tab)
  try { await fetch("/api/shop-request-notify?action=seller", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid }) }); } catch (e) { /* ignore */ }
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
// Owner: approve an application (the shop goes live) or reject it (the shop is removed, the seller can apply again)
export async function approveSeller(seller, staff) {
  const b = writeBatch(db);
  b.update(doc(db, "shops", seller.slug), { status: "approved", active: true, updatedAt: new Date().toISOString() });
  b.update(doc(db, "sellers", seller.uid), { status: "approved", rejectNote: "", decidedAt: new Date().toISOString(), decidedBy: (staff && staff.email) || "" });
  await b.commit();
}
export async function rejectSeller(seller, note, staff) {
  const b = writeBatch(db);
  b.delete(doc(db, "shops", seller.slug));
  b.update(doc(db, "sellers", seller.uid), { status: "rejected", rejectNote: String(note || "").slice(0, 300), decidedAt: new Date().toISOString(), decidedBy: (staff && staff.email) || "" });
  await b.commit();
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
