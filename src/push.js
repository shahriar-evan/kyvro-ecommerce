import { getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getMessaging, getToken, deleteToken, isSupported, onMessage } from "firebase/messaging";
import { VAPID_KEY } from "./pushConfig";

const db = getFirestore(getApp());
const OFF_KEY = "kyvro_push_off";     // the customer switched notifications off on this device
const ASKED_KEY = "kyvro_push_asked"; // time the "Allow alerts" card was dismissed
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

export const pushConfigured = () => !!VAPID_KEY && !String(VAPID_KEY).startsWith("PASTE");

export async function pushSupported() {
  try {
    return pushConfigured() && typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && (await isSupported());
  } catch (e) { return false; }
}

export const pushPermission = () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

async function registration() {
  const cfg = encodeURIComponent(JSON.stringify(getApp().options));
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?c=${cfg}`);
  await navigator.serviceWorker.ready;
  return reg;
}

async function currentToken() {
  const reg = await registration();
  return getToken(getMessaging(getApp()), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
}

async function saveToken(user, token) {
  await setDoc(doc(db, "pushTokens", token), {
    token,
    uid: user.uid,
    email: String(user.email || "").toLowerCase(),
    ua: String(navigator.userAgent || "").slice(0, 200),
    createdAt: serverTimestamp(),
  });
}

// Register the service worker ahead of time, so tapping "Allow" later is quick
export function warmPush() {
  registration().catch(() => {});
}

// Asks the browser for permission (call straight from a click) and saves this device
export async function enablePush(user) {
  if (typeof window === "undefined" || !("Notification" in window)) return { ok: false, reason: "unsupported" };
  // The permission popup must be asked first, right inside the click
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm };
  if (!(await pushSupported())) return { ok: false, reason: "unsupported" };
  const token = await currentToken();
  if (!token) return { ok: false, reason: "no-token" };
  await saveToken(user, token);
  ls.del(OFF_KEY);
  return { ok: true };
}

export async function disablePush() {
  ls.set(OFF_KEY, "1");
  try {
    const token = await currentToken();
    if (token) await deleteDoc(doc(db, "pushTokens", token)).catch(() => {});
    await deleteToken(getMessaging(getApp())).catch(() => {});
  } catch (e) { /* ignore */ }
}

// Already allowed earlier: keep this device's token fresh (no popup)
export async function syncPushIfGranted(user) {
  if (!(await pushSupported())) return;
  if (pushPermission() !== "granted" || ls.get(OFF_KEY)) return;
  try {
    const token = await currentToken();
    if (token) await saveToken(user, token);
  } catch (e) { /* ignore */ }
}

export async function myPushOn() {
  if (!(await pushSupported())) return false;
  if (pushPermission() !== "granted" || ls.get(OFF_KEY)) return false;
  try {
    const token = await currentToken();
    if (!token) return false;
    const snap = await getDoc(doc(db, "pushTokens", token));
    return snap.exists();
  } catch (e) { return false; }
}

// "Allow alerts" card: not shown again for 7 days after "Not now"
export const shouldAskPush = () => {
  const t = Number(ls.get(ASKED_KEY) || 0);
  return !t || Date.now() - t > 7 * 24 * 3600 * 1000;
};
export const dismissPushAsk = () => ls.set(ASKED_KEY, String(Date.now()));

// While the website is open, show the notification too
export function listenForeground() {
  try {
    return onMessage(getMessaging(getApp()), (payload) => {
      const d = (payload && payload.data) || {};
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(d.title || "Kyvro", {
        body: d.body || "", icon: d.icon || "/kyvro-icon.png", data: { link: d.link || "/" },
      }));
    });
  } catch (e) { return () => {}; }
}