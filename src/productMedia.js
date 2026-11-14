import { getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";

const db = getFirestore(getApp());

// Product media kit (product page → Marketing kit): productMedia/{productId} = { photos: [file], videos: [file], updatedAt, updatedBy }
// file = { url (Vercel Blob https link), name, size, type, at (ms), by (email) }. Team + sellers read; the team adds / removes.
// The files go straight from the browser to Vercel Blob with a token from api/plan.js?action=media-upload.
export const MEDIA_MAX = { photos: 40, videos: 15 };
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";
export const MAX_BYTES = { photos: 25 * 1024 * 1024, videos: 500 * 1024 * 1024 };

// only our own Vercel Blob links are shown / downloaded
export const okMediaUrl = (u) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/product-media\//i.test(String(u || ""));

const clean = (list) => (Array.isArray(list) ? list.filter((f) => f && okMediaUrl(f.url)) : []);

export async function loadProductMedia(productId) {
  const snap = await getDoc(doc(db, "productMedia", String(productId)));
  const d = snap.exists() ? snap.data() : {};
  return { photos: clean(d.photos), videos: clean(d.videos) };
}

async function token() {
  const u = auth.currentUser;
  if (!u) throw new Error("Please sign in again.");
  return u.getIdToken();
}

const safeName = (name) => String(name || "file").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(-80) || "file";

// Upload one file and add it to the product's list. kind = 'photos' | 'videos'. Returns the new lists.
export async function addProductMedia(productId, kind, file, current, onProgress) {
  const { upload } = await import("@vercel/blob/client");
  const pid = String(productId);
  const folder = kind === "videos" ? "video" : "photo";
  const idToken = await token();
  const blob = await upload(`product-media/${pid}/${folder}/${safeName(file.name)}`, file, {
    access: "public",
    handleUploadUrl: "/api/plan?action=media-upload",
    headers: { Authorization: `Bearer ${idToken}` },
    contentType: file.type || undefined,
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: onProgress ? (p) => onProgress(Math.round(p.percentage || 0)) : undefined,
  });
  const by = String((auth.currentUser && auth.currentUser.email) || "");
  const item = { url: blob.url, name: String(file.name || "").slice(0, 120), size: file.size || 0, type: file.type || "", at: Date.now(), by };
  const next = { ...current, [kind]: [...(current[kind] || []), item].slice(-MEDIA_MAX[kind]) };
  await setDoc(doc(db, "productMedia", pid), { photos: next.photos || [], videos: next.videos || [], updatedAt: serverTimestamp(), updatedBy: by });
  return next;
}

// Remove one file: off the list first (so nobody sees a dead link), then the file itself from Vercel Blob.
export async function removeProductMedia(productId, kind, url, current) {
  const pid = String(productId);
  const next = { ...current, [kind]: (current[kind] || []).filter((f) => f.url !== url) };
  const by = String((auth.currentUser && auth.currentUser.email) || "");
  await setDoc(doc(db, "productMedia", pid), { photos: next.photos || [], videos: next.videos || [], updatedAt: serverTimestamp(), updatedBy: by });
  try {
    await fetch("/api/plan?action=media-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ url }),
    });
  } catch (e) { /* the list is already updated; a leftover file only takes space */ }
  return next;
}

// Save a file to the phone / computer at full quality.
// Vercel Blob links download with ?download=1 (the server sends it as an attachment); data: links download directly;
// anything else is fetched first (same-origin pictures), else opened in a new tab.
export async function downloadFile(url, name) {
  const a = document.createElement("a");
  a.rel = "noopener";
  a.download = name || "";
  if (okMediaUrl(url)) {
    a.href = `${url}${url.includes("?") ? "&" : "?"}download=1`;
  } else if (/^data:/.test(url)) {
    a.href = url;
  } else {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("fetch");
      const obj = URL.createObjectURL(await r.blob());
      a.href = obj;
      setTimeout(() => URL.revokeObjectURL(obj), 30000);
    } catch (e) {
      window.open(url, "_blank", "noopener");
      return;
    }
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// file name for a product photo that has none (data URL / asset): "<product-name>-<n>.<ext>"
export function photoName(product, i, url) {
  const ext = (/^data:image\/(png|jpeg|webp)/.exec(url || "") || [])[1] || (String(url || "").split("?")[0].split(".").pop() || "jpg").slice(0, 4);
  return `${safeName(product && product.name).toLowerCase()}-${i + 1}.${ext === "jpeg" ? "jpg" : ext}`;
}
