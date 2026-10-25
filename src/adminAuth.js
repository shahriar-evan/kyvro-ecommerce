import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, deleteField, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";
import { isOwnerEmail, ownerName } from "./adminEmails";

const db = getFirestore(getApp());
const norm = (e) => (e || "").trim().toLowerCase();

// owner   = everything (team add/remove/edit, access ON/OFF, all products)
// manager = add/edit products, delete only own products, can add new Admins
// admin   = add/edit products (cannot delete)
export const ROLES = ["owner", "manager", "admin"];
export const ROLE_LABELS = { owner: "Owner", manager: "Manager", admin: "Admin" };

// Returns role = 'owner' | 'manager' | 'admin' | null (not on the list) and active = access ON/OFF
export async function getAdminStatus(email) {
  if (!email) return { role: null, active: false, name: "" };
  if (isOwnerEmail(email)) return { role: "owner", active: true, name: ownerName(email) };
  try {
    const snap = await getDoc(doc(db, "admins", norm(email)));
    if (!snap.exists()) return { role: null, active: false, name: "" };
    const data = snap.data();
    return {
      role: ROLES.includes(data.role) ? data.role : "admin", // older entries without a role = admin
      active: data.active !== false,
      name: data.name || "",
    };
  } catch (err) {
    console.error("Admin status check failed:", err);
    return { role: null, active: false, name: "" };
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
      if (!snap.exists()) return callback({ role: null, active: false, name: "" });
      const data = snap.data();
      callback({ role: ROLES.includes(data.role) ? data.role : "admin", active: data.active !== false, name: data.name || "" });
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

// Owner-only details (phone, note and the password that was set when the person was added)
// live in a separate collection so managers can never read them.
export async function listPrivateDetails() {
  try {
    const snap = await getDocs(collection(db, "adminPrivate"));
    const map = {};
    snap.docs.forEach((d) => { map[d.id] = d.data(); });
    return map;
  } catch (err) {
    return {}; // not an owner: no access
  }
}

// Creates a Firebase email+password account and adds the person to the team list with a role.
// A secondary app is used so the person adding them stays logged in.
export async function createAdminAccount(email, password, role = "admin", profile = {}) {
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
    name: (profile.name || "").trim(),
    role,
    active: true,
    addedBy: auth.currentUser?.email || "",
    addedByName: profile.addedByName || "",
    createdAt: serverTimestamp(),
  });
  // Owner-only extras. The password is only saved when we really created the account
  // (if the account already existed, the password typed here is not its real password).
  try {
    const priv = { phone: (profile.phone || "").trim(), note: (profile.note || "").trim() };
    if (accountCreated) priv.password = password;
    await setDoc(doc(db, "adminPrivate", e), priv);
  } catch (err) {
    console.warn("Could not save private details:", err);
  }
  return { accountCreated };
}

// Owner edits name (public to the team) and phone / note (owner-only)
export async function updateAdminProfile(email, { name, phone, note }) {
  const e = norm(email);
  await updateDoc(doc(db, "admins", e), { name: (name || "").trim() });
  await setDoc(doc(db, "adminPrivate", e), { phone: (phone || "").trim(), note: (note || "").trim() }, { merge: true });
}

export async function setAdminRole(email, role) {
  if (!ROLES.includes(role)) throw new Error("Invalid role");
  await updateDoc(doc(db, "admins", norm(email)), { role });
}

export async function setAdminActive(email, active) {
  await updateDoc(doc(db, "admins", norm(email)), { active: !!active });
}

export async function removeAdmin(email) {
  const e = norm(email);
  await deleteDoc(doc(db, "admins", e));
  try { await deleteDoc(doc(db, "adminPrivate", e)); } catch (err) { /* nothing stored */ }
}

// After a reset email the stored password is no longer correct, so it is cleared.
export async function sendAdminPasswordReset(email) {
  const e = norm(email);
  await sendPasswordResetEmail(auth, e);
  try { await updateDoc(doc(db, "adminPrivate", e), { password: deleteField() }); } catch (err) { /* nothing stored */ }
}
