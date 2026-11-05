// Seller dashboard banner slides (settings/sellerDash): public read, only the Owner writes (firestore.rules).
// Each slide is a picture (data:image/png|jpeg|webp;base64,...) and an optional https link. Max 3 slides.
// While the Owner has saved none, the dashboard shows the main site's first two banners.
import { getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

export const DASH_BANNER_MAX = 3;
const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function normalizeSellerDash(d) {
  const list = d && Array.isArray(d.banners) ? d.banners : [];
  return {
    banners: list
      .filter((b) => b && typeof b.image === 'string' && IMG_RE.test(b.image) && b.image.length <= 300000)
      .slice(0, DASH_BANNER_MAX)
      .map((b) => ({ image: b.image, link: typeof b.link === 'string' && /^https:\/\/[^ <>"]+$/.test(b.link) && b.link.length <= 300 ? b.link : '' })),
  };
}

export function watchSellerDash(onData) {
  return onSnapshot(doc(db, "settings", "sellerDash"), (snap) => onData(normalizeSellerDash(snap.exists() ? snap.data() : null)), () => onData(normalizeSellerDash(null)));
}

export async function saveSellerDash(banners, staff) {
  const clean = normalizeSellerDash({ banners });
  await setDoc(doc(db, "settings", "sellerDash"), {
    banners: clean.banners,
    updatedAt: serverTimestamp(),
    updatedByName: String((staff && (staff.name || staff.email)) || '').slice(0, 80),
  });
}
