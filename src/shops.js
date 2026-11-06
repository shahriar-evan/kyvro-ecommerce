import { getApp } from "firebase/app";
import { getFirestore, doc, collection, query, where, onSnapshot, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp, getDocs, getDoc, writeBatch } from "firebase/firestore";
import { isReservedLink } from "./data/reservedLinks";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

export const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const slugify = (s) => String(s || "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "shop";
const rand = () => Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, "x");

// ---- Shop link name ("handle"): kyvro.store/<handle> (old form kyvro.store/?shop=<handle> still works). The shop document id (slug) never changes, because orders,
// earnings and payouts point at it; the handle is a public nickname on top of it, kept unique by shopHandles/{handle}
// ({ slug, uid }). Any plan can change its handle, at most once in 30 days (handleChangedAt). Old handles are kept as
// aliases that still open (and redirect to) the shop, so shared links never break and nobody else can take them.
// ?shop=<slug> always keeps working. ----
// 3 to 30 letters: a-z, 0-9 and "-" (not first or last). Same check in firestore.rules.
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
export const cleanHandle = (v) => String(v || "").toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
// "rahim-fashion" -> "Rahim Fashion" (the name a shop shows until it creates its own Website Name)
export const prettyHandle = (h) => String(h || "").split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
export const HANDLE_COOLDOWN_DAYS = 30;
// when this shop may change its link again (0 = now)
export const nextHandleChange = (shop) => {
  const t = shop && shop.handleChangedAt;
  const ms = !t ? 0 : typeof t.toMillis === "function" ? t.toMillis() : typeof t.seconds === "number" ? t.seconds * 1000 : Date.parse(t) || 0;
  return ms ? ms + HANDLE_COOLDOWN_DAYS * 86400000 : 0;
};
// the public link of a shop: its handle, else its id
export const shopLinkKey = (shop) => (shop && (shop.handle || shop.slug)) || "";
export const shopLinkUrl = (shop) => `${window.location.origin}/${shopLinkKey(shop)}`;
// what the visitor sees in links and previews: kyvro.store/<link>
export const shopLinkText = (key) => `kyvro.store/${key}`;
// ?shop=<key>: a handle or a shop id -> the shop id
export async function resolveShopKey(key) {
  try { const h = await getDoc(doc(db, "shopHandles", key)); if (h.exists() && SLUG_RE.test(String(h.data().slug || ""))) return h.data().slug; } catch (e) { /* not a handle */ }
  return key;
}
// is this link name used by another shop (as a handle, an old alias or a shop id)? My own old aliases are free for me.
export async function handleTaken(handle, mySlug = "") {
  const h = await getDoc(doc(db, "shopHandles", handle));
  if (h.exists() && h.data().slug !== mySlug) return true;
  if (handle !== mySlug) { const s = await getDoc(doc(db, "shops", handle)); if (s.exists()) return true; }
  return false;
}
// change my shop's link name: claim the new handle (or reuse one of my old aliases) and point the shop at it. The old
// handle stays as an alias of this shop. Allowed once in 30 days (the rules check handleChangedAt).
export async function setShopHandle(shop, uid, handle) {
  const b = writeBatch(db);
  const mine = await getDoc(doc(db, "shopHandles", handle));
  if (!mine.exists()) b.set(doc(db, "shopHandles", handle), { slug: shop.slug, uid });
  b.update(doc(db, "shops", shop.slug), { handle, handleChangedAt: serverTimestamp(), updatedAt: new Date().toISOString() });
  await b.commit();
}
// Owner: free the handle of a shop that is being removed
export async function releaseShopHandle(slug) {
  try {
    const s = await getDoc(doc(db, "shops", slug));
    const h = s.exists() ? s.data().handle : "";
    if (h) await deleteDoc(doc(db, "shopHandles", h));
  } catch (e) { /* nothing to free */ }
}

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

// every shop of one account (a seller can have more than one, by plan)
export function watchMyShops(uid, onData, onError) {
  return onSnapshot(
    query(collection(db, "shops"), where("ownerUid", "==", uid)),
    (snap) => onData(snap.docs.map((d) => ({ slug: d.id, ...d.data() }))),
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
  const data = {
    name: shopName,
    ownerUid: uid,
    active: !pending,
    status: pending ? "pending" : "approved",
    items: {},
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };
  // the public link = the shop name ("Zayra" -> kyvro.store/zayra) when that link is free; else the shop id as before.
  // No handleChangedAt, so the owner can still change the link right away in My Shop.
  const handle = cleanHandle(shopName);
  let linked = false;
  if (HANDLE_RE.test(handle) && !isReservedLink(handle)) {
    try {
      if (!(await handleTaken(handle))) {
        const b = writeBatch(db);
        b.set(doc(db, "shops", slug), { ...data, handle });
        b.set(doc(db, "shopHandles", handle), { slug, uid });
        await b.commit();
        linked = true;
      }
    } catch (e) { /* link not allowed (blocked word) or just taken: fall back to the plain shop id */ }
  }
  if (!linked) await setDoc(doc(db, "shops", slug), data);
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
  await releaseShopHandle(slug);
  await deleteDoc(doc(db, "shops", slug));
  try { await deleteDoc(doc(db, "shopOwners", slug)); } catch (err) { /* nothing stored */ }
}

// extra: { planExempt: true } for the Owner's own shop (no plan limit; the rules allow it only for the Owner)
// Shop name change (its own Save button in My Shop). The link (slug) never changes.
// Website Name (Premium): from now on the shop shows this name instead of its pretty link name (autoName off)
export const saveShopName = (slug, name) =>
  updateDoc(doc(db, "shops", slug), { name: String(name || "").trim().slice(0, 60), autoName: deleteField(), updatedAt: new Date().toISOString() });
// is this name already used by another shop? (same letters, any upper / lower case; shops are public)
export async function shopNameTaken(name, mySlug) {
  const n = String(name || "").trim().toLowerCase();
  const snap = await getDocs(collection(db, "shops"));
  return snap.docs.some((d) => d.id !== mySlug && String(d.data().name || "").trim().toLowerCase() === n);
}

// name = null: the name is not written (no "Shop name change" feature). The link (slug) never changes.
export const saveShopItems = (slug, name, items, extra = {}) =>
  updateDoc(doc(db, "shops", slug), { ...(name == null ? {} : { name: String(name || "").trim().slice(0, 60) }), items, ...extra, updatedAt: new Date().toISOString() });

// Owner only: switch a shop on / off
export const setShopActive = (slug, on) => updateDoc(doc(db, "shops", slug), { active: !!on });

// ---- Shop logo: a Pro shop asks for permission; with the logo feature on, the owner uploads one that waits for the
// Owner / a Manager to approve. The picture is a small data URL inside the shop document (same way product photos are kept).
export const requestLogo = (slug) => updateDoc(doc(db, "shops", slug), { logoRequest: { at: new Date().toISOString() }, updatedAt: new Date().toISOString() });
export async function uploadLogo(slug, dataUrl) {
  await updateDoc(doc(db, "shops", slug), { logoPending: dataUrl, logoPendingAt: new Date().toISOString(), logoReject: deleteField(), updatedAt: new Date().toISOString() });
  try { await fetch("/api/shop-request-notify?action=logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }); } catch (e) { /* ignore */ }
}
// Owner / Manager (Plan Members)
export const setShopFeatures = (slug, features) => updateDoc(doc(db, "shops", slug), { features, updatedAt: new Date().toISOString() });
export const grantLogo = (slug, features) => updateDoc(doc(db, "shops", slug), { features: { ...(features || {}), logo: true }, logoRequest: deleteField(), updatedAt: new Date().toISOString() });
export const denyLogoRequest = (slug, note) => updateDoc(doc(db, "shops", slug), { logoRequest: deleteField(), logoReject: { note: String(note || "").slice(0, 200), at: new Date().toISOString(), kind: "request" }, updatedAt: new Date().toISOString() });
// the shop's owner takes the live logo / banner off (Premium; a new one can be uploaded and approved later)
export const removeLogo = (slug) => updateDoc(doc(db, "shops", slug), { logo: deleteField(), updatedAt: new Date().toISOString() });
export const removeBanner = (slug) => updateDoc(doc(db, "shops", slug), { banner: deleteField(), updatedAt: new Date().toISOString() });
export const approveLogo = (shop) => updateDoc(doc(db, "shops", shop.slug), { logo: shop.logoPending, logoPending: deleteField(), logoPendingAt: deleteField(), updatedAt: new Date().toISOString() });
export const rejectLogo = (slug, note) => updateDoc(doc(db, "shops", slug), { logoPending: deleteField(), logoPendingAt: deleteField(), logoReject: { note: String(note || "").slice(0, 200), at: new Date().toISOString(), kind: "logo" }, updatedAt: new Date().toISOString() });
// Owner: make a switched-off / killed / inactive-hidden shop live again in one go (the Preview bar's "Switch on")
export const turnShopOn = (slug) => updateDoc(doc(db, "shops", slug), { active: true, killed: false, killNote: "", inactiveHold: false, updatedAt: new Date().toISOString() });
// a seller switches their own approved shop ON / OFF (ON also clears an inactivity hide). Not a killed or waiting shop.
export const setMyShopLive = (slug, on) => updateDoc(doc(db, "shops", slug), { active: !!on, ...(on ? { inactiveHold: false } : {}), updatedAt: new Date().toISOString() });
export const setShopOn = (slug, on) => updateDoc(doc(db, "shops", slug), { active: !!on, updatedAt: new Date().toISOString() });

// ---- Shop banner (Premium): uploaded banners wait for the Owner / a Manager like the logo ----
export async function uploadBanner(slug, dataUrl) {
  await updateDoc(doc(db, "shops", slug), { bannerPending: dataUrl, bannerPendingAt: new Date().toISOString(), bannerReject: deleteField(), updatedAt: new Date().toISOString() });
  try { await fetch("/api/shop-request-notify?action=logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, kind: "banner" }) }); } catch (e) { /* ignore */ }
}
export const approveBanner = (shop) => updateDoc(doc(db, "shops", shop.slug), { banner: shop.bannerPending, bannerPending: deleteField(), bannerPendingAt: deleteField(), updatedAt: new Date().toISOString() });
export const rejectBanner = (slug, note) => updateDoc(doc(db, "shops", slug), { bannerPending: deleteField(), bannerPendingAt: deleteField(), bannerReject: { note: String(note || "").slice(0, 200), at: new Date().toISOString() }, updatedAt: new Date().toISOString() });
