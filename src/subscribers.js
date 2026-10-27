import { getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField, onSnapshot, getDocs, collection, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";

const db = getFirestore(getApp());
const key = (email) => String(email || "").trim().toLowerCase();

// A long random code. It is only used inside the "Unsubscribe" link of the emails sent to this person.
const randomToken = () => {
  const bytes = new Uint8Array(24);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

// Called when a customer signs in with Google: adds them to the offer-email list ONCE.
// If they already exist (even if they unsubscribed earlier) nothing changes, so a choice to stop is respected.
export async function ensureSubscribed(user) {
  const email = key(user && user.email);
  if (!email || !user.uid) return;
  const ref = doc(db, "subscribers", email);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    email,
    name: (user.displayName || "").slice(0, 80),
    uid: user.uid,
    token: randomToken(),
    source: "login",
    unsubscribed: false,
    createdAt: serverTimestamp(),
  });
}

// The customer's own switch (Account -> Settings)
export function watchMySubscription(email, onData) {
  return onSnapshot(
    doc(db, "subscribers", key(email)),
    (snap) => onData(snap.exists() ? { exists: true, on: snap.data().unsubscribed !== true } : { exists: false, on: false }),
    () => onData({ exists: false, on: false })
  );
}

export async function setMySubscription(user, on) {
  const email = key(user.email);
  const ref = doc(db, "subscribers", email);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await ensureSubscribed(user);
    if (on) return;
  }
  await updateDoc(ref, on
    ? { unsubscribed: false, unsubscribedAt: deleteField(), unsubWith: deleteField(), updatedAt: serverTimestamp() }
    : { unsubscribed: true, unsubscribedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

// ---- Owner only ----
export async function countSubscribers() {
  const snap = await getDocs(collection(db, "subscribers"));
  let active = 0;
  snap.forEach((d) => { if (d.data().unsubscribed !== true) active++; });
  return { total: snap.size, active };
}

// Asks the server (api/send-offer.js on Vercel) to send the email. The Owner's login proves who is asking.
export async function sendOfferEmail({ subject, message, testOnly }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const idToken = await user.getIdToken();
  let res;
  try {
    res = await fetch("/api/send-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ subject, message, testOnly: !!testOnly }),
    });
  } catch (e) {
    throw new Error("Could not reach the email service. This only works on the live site (Vercel), not on localhost.");
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok) throw new Error(data.error || `Sending failed (${res.status}).`);
  return data;
}
