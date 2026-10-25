import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";
import { isOwnerEmail } from "./adminEmails";

const db = getFirestore(getApp());
const norm = (e) => (e || "").trim().toLowerCase();

// owner   = everything (team add/remove/edit, access ON/OFF, all products)
// manager = add/edit products, delete only own products, can add new Admins
// admin   = add/edit products (cannot delete)
export const ROLES = ["owner", "manager", "admin"];
export const ROLE_LABELS = { owner: "Owner", manager: "Manager", admin: "Admin" };

// Returns role = 'owner' | 'manager' | 'admin' | null (not on the list) and active = access ON/OFF
export async function getAdminStatus(email) {
  if (!email) return { role: null, active: false };
  if (isOwnerEmail(email)) return { role: "owner", active: true };
  try {
    const snap = await getDoc(doc(db, "admins", norm(email)));
    if (!snap.exists()) return { role: null, active: false };
    const data = snap.data();
    return {
      role: ROLES.includes(data.role) ? data.role : "admin", // older entries without a role = admin
      active: data.active !== false,
    };
  } catch (err) {
    console.error("Admin status check failed:", err);
    return { role: null, active: false };
  }
}

// Returns the role only if access is ON, otherwise null
export async function getAdminRole(email) {
  const { role, active } = await getAdminStatus(email);
  return role && active ? role : null;
}

// Realtime: get notified immediately if your own entry changes (access OFF, removed, role changed)
export function watchAdminAccess(email, callback) {
  return onSnapshot(
    doc(db, "admins", norm(email)),
    (snap) => {
      if (!snap.exists()) return callback({ role: null, active: false });
      const data = snap.data();
      callback({ role: ROLES.includes(data.role) ? data.role : "admin", active: data.active !== false });
    },
    () => {} // ignore network/permission errors
  );
}

export async function listAdmins() {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => {
    const data = d.data();
    return { email: d.id, ...data, role: ROLES.includes(data.role) ? data.role : "admin", active: data.active !== false };
  });
}

// Creates a Firebase email+password account and adds the person to the team list with a role.
// A secondary app is used so the person adding them stays logged in.
export async function createAdminAccount(email, password, role = "admin") {
  const e = norm(email);
  if (!ROLES.includes(role)) throw new Error("Invalid role");
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
    role,
    active: true,
    addedBy: auth.currentUser?.email || "",
    createdAt: serverTimestamp(),
  });
  return { accountCreated };
}

export async function setAdminRole(email, role) {
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  await updateDoc(doc(db, "admins", norm(email)), { role });
}

export async function setAdminActive(email, active) {
  await updateDoc(doc(db, "admins", norm(email)), { active: !!active });
}

export async function removeAdmin(email) {
  await deleteDoc(doc(db, "admins", norm(email)));
}

export const sendAdminPasswordReset = (email) => sendPasswordResetEmail(auth, norm(email));
