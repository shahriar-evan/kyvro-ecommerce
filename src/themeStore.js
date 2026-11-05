// Saving / reading the storefront theme. Main site: settings/theme (public read, Owner write). A shop: its own doc
// (shops/{slug}.theme + .themeMode; the shop's owner, the Owner; firestore.rules checks the plan).
import { getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { cleanTheme, cleanMode } from "./data/themes";

const db = getFirestore(getApp());

export function watchSiteTheme(onData) {
  return onSnapshot(doc(db, "settings", "theme"),
    (snap) => { const d = snap.exists() ? snap.data() : {}; onData({ theme: cleanTheme(d.theme), mode: cleanMode(d.themeMode) }); },
    () => onData({ theme: 'classic', mode: 'auto' }));
}

export async function saveSiteTheme(theme, mode, staff) {
  await setDoc(doc(db, "settings", "theme"), {
    theme: cleanTheme(theme),
    themeMode: cleanMode(mode),
    updatedAt: serverTimestamp(),
    updatedByName: String((staff && (staff.name || staff.email)) || '').slice(0, 80),
  });
}

export async function saveShopTheme(slug, theme, mode) {
  await updateDoc(doc(db, "shops", slug), { theme: cleanTheme(theme), themeMode: cleanMode(mode), updatedAt: new Date().toISOString() });
}
