import { getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp, collection, query, where } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// A customer's profile lives in users/{uid}: { name, photoURL, saved: [productIds] }.
// Only that customer can read or change it (enforced by Firestore rules).
export function watchProfile(uid, onData) {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => onData(snap.exists() ? snap.data() : {}),
    () => onData({})
  );
}

export async function saveProfile(uid, patch) {
  await setDoc(doc(db, "users", uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

// The customer's own orders (orders placed while logged in), newest first.
// No orderBy here on purpose: it would need an extra Firestore index, so we sort in the browser.
export function watchMyOrders(uid, onData, onError) {
  const q = query(collection(db, "orders"), where("uid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const ms = (o) => (o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : 0);
      list.sort((a, b) => ms(b) - ms(a));
      onData(list);
    },
    (err) => onError && onError(err)
  );
}
