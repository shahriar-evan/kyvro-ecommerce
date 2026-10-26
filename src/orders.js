import { getApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// e.g. KYV-261026-4821 (date + 4 random digits)
const makeOrderNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `KYV-${yy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Customers do not log in. Anyone can create an order; only the team can read or change it
// (enforced by Firestore rules). Retries with a new number in the very unlikely case of a clash.
export async function placeOrder(order) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = makeOrderNumber();
    try {
      await setDoc(doc(db, "orders", orderNumber), { ...order, orderNumber, createdAt: serverTimestamp() });
      return { orderNumber };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Live list of all orders, newest first (team members only)
export function watchOrders(onData, onError) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

const historyEntry = (label, staff) => ({
  status: label,
  by: staff.email || "",
  byName: staff.name || staff.email || "",
  at: new Date().toISOString(),
});

// Moves an order to a new status and records who did it and when
export async function updateOrderStatus(orderId, status, staff) {
  const patch = {
    status,
    updatedAt: serverTimestamp(),
    history: arrayUnion(historyEntry(status, staff)),
  };
  if (status === "Processing") {
    patch.confirmedBy = staff.email || "";
    patch.confirmedByName = staff.name || staff.email || "";
  }
  await updateDoc(doc(db, "orders", orderId), patch);
}

export async function markOrderPaid(orderId, staff) {
  await updateDoc(doc(db, "orders", orderId), {
    paymentStatus: "Paid",
    updatedAt: serverTimestamp(),
    history: arrayUnion(historyEntry("Payment received", staff)),
  });
}
