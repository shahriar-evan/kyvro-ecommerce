import { getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { normalizeSettings, discountLimits } from "./data/shopConfig";

const db = getFirestore(getApp());

// Everyone (customers too) can read the store settings: banner text and discount rules
export function watchStoreSettings(onData) {
  return onSnapshot(
    doc(db, "settings", "store"),
    (snap) => onData(normalizeSettings(snap.exists() ? snap.data() : null)),
    () => {} // offline or blocked: keep the defaults
  );
}

// Only the Owner can save (enforced by Firestore rules)
export async function saveStoreSettings(settings, staff) {
  const clean = normalizeSettings(settings);
  await setDoc(doc(db, "settings", "store"), {
    announcementText: clean.announcementText.trim().slice(0, 500),
    discountEnabled: clean.discountEnabled,
    discountRules: clean.discountRules,
    ...discountLimits(clean),
    updatedAt: serverTimestamp(),
    updatedByName: (staff && (staff.name || staff.email)) || "",
  });
}
