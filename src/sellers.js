import { getApp } from "firebase/app";
import { getFirestore, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { releaseShopHandle, prettyHandle } from "./shops";

const db = getFirestore(getApp());

// ---- Public sellers ("Sell on Kyvro") ----
// A signed-in customer (not on the team) opens ONE shop. The shop is public (shops/{slug}, kind 'seller'); who owns it
// is private (sellers/{uid}: the seller and the Owner read it). Where the markup is paid (bKash) is in sellerPayout/{uid}:
// the seller writes it, only the Owner reads it. Sellers never see supplier data or customers' details.

// big brand names can never be part of a seller's shop name or link (always added to the Owner's list; also in
// firestore.rules: brandRe). The Owner can add more words in Sellers -> Seller settings.
export const BRAND_WORDS = ["nike", "adidas", "gucci", "zara", "apple", "puma", "reebok", "chanel", "prada", "dior", "versace", "armani", "rolex", "samsung", "uniqlo", "balenciaga", "burberry", "fendi", "hermes", "vuitton", "levis"];
export const DEFAULT_BLOCKED_WORDS = ["kyvro", "official", "admin", "owner", "support", ...BRAND_WORDS];
const escapeRe = (w) => String(w).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// the regex the Firestore rules use (whole-text match, lower case); no words = nothing is blocked
export const blockedRegexFor = (words) => {
  const list = (words || []).map((w) => String(w || "").trim().toLowerCase()).filter(Boolean);
  return list.length ? `.*(${list.map(escapeRe).join("|")}).*` : "^$";
};
export const normalizeSellerRules = (r) => {
  const saved = Array.isArray(r && r.blockedWords) ? r.blockedWords.map((w) => String(w || "").trim().toLowerCase()).filter(Boolean).slice(0, 100) : DEFAULT_BLOCKED_WORDS;
  const words = [...new Set([...saved, ...BRAND_WORDS])];
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

const cleanSellerSocials = (s) => Object.fromEntries(["facebook", "instagram", "tiktok"].map((k) => [k, String((s && s[k]) || "").trim().slice(0, 200)]));
// "Men's › Shirt" (category › sub-category)
const cleanSubs = (list) => (Array.isArray(list) ? list : []).map((c) => String(c).slice(0, 80)).slice(0, 60);

// Apply to sell: one batch writes the shop and the application (sellers/{uid}). The FIRST shop is live at once (approved,
// on); the Owner gets a notification and can switch it off (kill switch) or remove it. More shops (Pro / Premium) wait
// for the Owner's approval. The rules allow it once per account, and again only after a rejection or removal.
// handle = the shop link name (kyvro.store/<handle>). The shop shows its pretty link name until it creates a
// Website Name (Premium). The shop id (slug) is the handle plus 4 random letters and never changes.
export async function applyAsSeller({ uid, email, handle, details }) {
  const name = (prettyHandle(handle) || String(handle || "")).slice(0, 60);
  const slug = `${slugify(name)}-${rand()}`;
  const b = writeBatch(db);
  b.set(doc(db, "shopHandles", handle), { slug, uid });
  b.set(doc(db, "shops", slug), {
    name,
    handle,
    autoName: true,
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
    name: String(details.name || "").trim().slice(0, 80),
    whatsapp: normalizeWhatsapp(details.whatsapp),
    district: String(details.district || "").trim().slice(0, 40),
    area: String(details.area || "").trim().slice(0, 60),
    address: String(details.address || "").trim().slice(0, 300),
    // social media links (any of Facebook / Instagram / TikTok, https only, all optional)
    socialLinks: cleanSellerSocials(details.socialLinks),
    categories: (Array.isArray(details.categories) ? details.categories : []).map((c) => String(c).slice(0, 60)).slice(0, 20),
    subCategories: cleanSubs(details.subCategories),
    productNote: String(details.productNote || "").trim().slice(0, 300),
    agreed: details.agreed === true,
    // every shop of this seller (the first one is this application's shop; more by plan: Free 1, Pro 2, Premium 3)
    shops: [slug],
    status: "approved",
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
  await b.commit();
  // phone notification + email to the Owner (best effort; the application also shows in the Owner's Sellers tab)
  try { await fetch("/api/shop-request-notify?action=seller", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid }) }); } catch (e) { /* ignore */ }
  return slug;
}

// ---- More shops (Pro 2, Premium 3): an approved seller asks for another shop. It starts OFF and 'pending' until the
// Owner approves it (Sellers tab -> New shop requests); the Owner gets a phone notification. ----
// the seller visited the website (signed in): unused shops are removed after 30 days without a visit (daily job).
// At most once a day per device; nothing happens for an account that is not a seller.
export async function touchSellerSeen(uid) {
  if (!uid) return;
  try {
    const k = `kyvro_seen_${uid}`;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(k) === today) return;
    await updateDoc(doc(db, "sellers", uid), { lastSeenAt: serverTimestamp() });
    localStorage.setItem(k, today);
  } catch (e) { /* not a seller, or offline */ }
}
export const sellerShopList = (seller) => (seller && Array.isArray(seller.shops) && seller.shops.length ? seller.shops : seller && seller.slug ? [seller.slug] : []);
export async function requestSellerShop({ uid, seller, handle, categories }) {
  const slug = `${slugify(handle)}-${rand()}`;
  const b = writeBatch(db);
  b.set(doc(db, "shopHandles", handle), { slug, uid });
  b.set(doc(db, "shops", slug), {
    name: (prettyHandle(handle) || handle).slice(0, 60),
    handle,
    autoName: true,
    ownerUid: uid,
    kind: "seller",
    extra: true,
    categories: (Array.isArray(categories) ? categories : []).map((c) => String(c).slice(0, 60)).slice(0, 20),
    active: false,
    status: "pending",
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  });
  b.update(doc(db, "sellers", uid), { shops: [...sellerShopList(seller), slug] });
  await b.commit();
  try { await fetch("/api/shop-request-notify?action=seller-shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }); } catch (e) { /* ignore */ }
  return slug;
}
// Owner: reject a seller's extra shop request (the shop and its link are removed; the seller can ask again)
export async function rejectSellerShop(seller, slug) {
  await releaseShopHandle(slug);
  const b = writeBatch(db);
  b.delete(doc(db, "shops", slug));
  if (seller && seller.uid) b.update(doc(db, "sellers", seller.uid), { shops: sellerShopList(seller).filter((x) => x !== slug) });
  await b.commit();
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
// while the application waits: change the categories I want to sell
export const updateSellerCategories = (uid, categories, subCategories = []) =>
  updateDoc(doc(db, "sellers", uid), { categories: categories.map((c) => String(c).slice(0, 60)).slice(0, 20), subCategories: cleanSubs(subCategories) });

// Owner: approve an application (the shop goes live) or reject it (the shop is removed, the seller can apply again)
export async function approveSeller(seller, staff) {
  const b = writeBatch(db);
  b.update(doc(db, "shops", seller.slug), { status: "approved", active: true, updatedAt: new Date().toISOString() });
  b.update(doc(db, "sellers", seller.uid), { status: "approved", rejectNote: "", decidedAt: new Date().toISOString(), decidedBy: (staff && staff.email) || "" });
  await b.commit();
}
export async function rejectSeller(seller, note, staff) {
  await releaseShopHandle(seller.slug);
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
  for (const slug of sellerShopList(seller)) { await releaseShopHandle(slug); try { await deleteDoc(doc(db, "shops", slug)); } catch (e) { /* already gone */ } }
  await deleteDoc(doc(db, "sellers", seller.uid));
  try { await deleteDoc(doc(db, "sellerPayout", seller.uid)); } catch (e) { /* nothing saved */ }
}
