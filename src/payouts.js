import { getApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import "./firebase";

const db = getFirestore(getApp());

// "Paid out" records: what the Owner already paid to a team member (a Manager's markup or an Admin's commission).
// The Owner reads and writes all of them; a team member can read only their own.
export function watchPayouts(isOwner, email, onData, onError) {
  const q = isOwner ? collection(db, "payouts") : query(collection(db, "payouts"), where("email", "==", String(email || "").toLowerCase()));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => onError && onError(err));
}

export async function addPayout(email, name, amount, note, staff) {
  await addDoc(collection(db, "payouts"), {
    email: String(email || "").toLowerCase(),
    name: String(name || "").slice(0, 100),
    amount: Number(amount),
    note: String(note || "").slice(0, 200),
    at: new Date().toISOString(),
    by: staff.email || "",
  });
}

export async function deletePayout(id) {
  await deleteDoc(doc(db, "payouts", id));
}
