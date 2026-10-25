import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";
import { isOwnerEmail } from "./adminEmails";

const db = getFirestore(getApp());
const norm = (e) => (e || "").trim().toLowerCase();

// Login er por check: owner ba "admins" list e thaka email hole true
export async function isAuthorizedAdmin(email) {
  if (!email) return false;
  if (isOwnerEmail(email)) return true;
  try {
    const snap = await getDoc(doc(db, "admins", norm(email)));
    return snap.exists();
  } catch (err) {
    console.error("Admin check failed:", err);
    return false;
  }
}

export async function listAdmins() {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }));
}

// Notun admin: Firebase e email+password account banay + allowed list e add kore.
// Secondary app use kora hoyeche jate tumi (owner) logout na hou.
export async function createAdminAccount(email, password) {
  const e = norm(email);
  let accountCreated = true;
  const secondary = initializeApp(getApp().options, "secondary-" + Date.now());
  try {
    const sAuth = getAuth(secondary);
    await createUserWithEmailAndPassword(sAuth, e, password);
    await signOut(sAuth);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") accountCreated = false;
    else throw err;
  } finally {
    await deleteApp(secondary);
  }
  await setDoc(doc(db, "admins", e), {
    email: e,
    addedBy: auth.currentUser?.email || "",
    createdAt: serverTimestamp(),
  });
  return { accountCreated };
}

export async function removeAdmin(email) {
  await deleteDoc(doc(db, "admins", norm(email)));
}

export const sendAdminPasswordReset = (email) => sendPasswordResetEmail(auth, norm(email));
