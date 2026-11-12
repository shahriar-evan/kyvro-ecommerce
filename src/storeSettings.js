import { getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { normalizeSettings, discountLimits } from "./data/shopConfig";
import { normalizePlans } from "./data/priceCheck";

const db = getFirestore(getApp());

// The last store settings seen in this browser (announcement text, maintenance mode ...), shown at once on the next
// visit instead of the built-in defaults; the live ones replace them a moment later.
const SETTINGS_KEY = "kyvro_settings_cache";
export function cachedStoreSettings() {
  try { const c = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); return c ? normalizeSettings(c) : null; } catch (e) { return null; }
}

// Everyone (customers too) can read the store settings: banner text and discount rules
export function watchStoreSettings(onData) {
  return onSnapshot(
    doc(db, "settings", "store"),
    (snap) => {
      const data = normalizeSettings(snap.exists() ? snap.data() : null);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch (e) { /* no storage */ }
      onData(data);
    },
    () => {} // offline or blocked: keep the defaults
  );
}

// Only the Owner can save (enforced by Firestore rules)
export async function saveStoreSettings(settings, staff) {
  const clean = normalizeSettings(settings);
  await setDoc(doc(db, "settings", "store"), {
    announcementText: clean.announcementText.trim().slice(0, 500),
    bannerSpeed: clean.bannerSpeed,
    discountEnabled: clean.discountEnabled,
    discountRules: clean.discountRules,
    deliveryInside: clean.deliveryInside,
    deliveryOutside: clean.deliveryOutside,
    deliveryExtraPerItem: clean.deliveryExtraPerItem,
    deliveryIncludedItems: clean.deliveryIncludedItems,
    freeDeliveryEnabled: clean.freeDeliveryEnabled,
    freeDeliveryMin: clean.freeDeliveryMin,
    freeDeliveryFor: clean.freeDeliveryFor,
    maintenanceMode: clean.maintenanceMode,
    maintenanceMessage: clean.maintenanceMessage.trim().slice(0, 300),
    ...discountLimits(clean),
    updatedAt: serverTimestamp(),
    updatedByName: (staff && (staff.name || staff.email)) || "",
  });
}

// ---- Shop plans (settings/plans): Free limit, paid price, period, reminder days. Everyone can read, only the Owner saves ----
export function watchPlans(onData) {
  return onSnapshot(
    doc(db, "settings", "plans"),
    (snap) => onData(normalizePlans(snap.exists() ? snap.data() : null)),
    () => onData(normalizePlans(null)) // offline or not published yet: the defaults
  );
}
export async function savePlans(plans, staff) {
  const p = normalizePlans(plans);
  await setDoc(doc(db, "settings", "plans"), {
    ...p,
    updatedAt: serverTimestamp(),
    updatedByName: (staff && (staff.name || staff.email)) || "",
  });
}

// The signed-in team member's own plan (subscriptions/{uid}). Only the server writes it, after a verified payment.
export function watchMySubscription(uid, onData) {
  if (!uid) { onData(null); return () => {}; }
  return onSnapshot(
    doc(db, "subscriptions", uid),
    (snap) => onData(snap.exists() ? snap.data() : null),
    () => onData(null)
  );
}
