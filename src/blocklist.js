import { getApp } from "firebase/app";
import { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists
import { phoneKey, emailKey } from "./data/shopConfig";

const db = getFirestore(getApp());

// Blocked phone numbers (blockedPhones/<phoneKey>) and blocked accounts (blockedEmails/<email>).
// The Firestore rules refuse a new order from a blocked phone number or a blocked signed-in account.
export function watchBlocked(onData) {
  const state = { phones: {}, emails: {} };
  const push = () => onData({ phones: { ...state.phones }, emails: { ...state.emails } });
  const toMap = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  const stopP = onSnapshot(collection(db, "blockedPhones"), (s) => { state.phones = toMap(s); push(); }, () => {});
  const stopE = onSnapshot(collection(db, "blockedEmails"), (s) => { state.emails = toMap(s); push(); }, () => {});
  return () => { stopP(); stopE(); };
}

const by = (staff) => ({ blockedBy: staff.email || "", blockedByName: staff.name || staff.email || "", at: serverTimestamp() });

export const blockPhone = (phone, orderNumber, staff) =>
  setDoc(doc(db, "blockedPhones", phoneKey(phone)), { phone: String(phone).slice(0, 30), orderNumber: orderNumber || "", ...by(staff) });

export const blockEmail = (email, orderNumber, staff) =>
  setDoc(doc(db, "blockedEmails", emailKey(email)), { email: emailKey(email), orderNumber: orderNumber || "", ...by(staff) });

export const unblockPhone = (key) => deleteDoc(doc(db, "blockedPhones", key));
export const unblockEmail = (key) => deleteDoc(doc(db, "blockedEmails", key));
