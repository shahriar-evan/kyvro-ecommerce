import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// FIREBASE CONFIGURATION
// apiKey: Firebase Console -> Project settings -> Your apps -> Config theke COPY-PASTE koro (hat e type korbe na)
const firebaseConfig = {
  apiKey: "AIzaSyDAiO5aF_CfN1jMZKngS1lHCTp_I04SeL0",
  authDomain: "kyvro-admin-auth.firebaseapp.com",
  projectId: "kyvro-admin-auth",
  storageBucket: "kyvro-admin-auth.firebasestorage.app",
  messagingSenderId: "26731438378",
  appId: "1:26731438378:web:45571f4a21768719b2fe53",
  measurementId: "G-QV58XT3CT4"
};

const app = initializeApp(firebaseConfig);

// Firestore keeps what it read in the browser (IndexedDB, shared by every tab). When the page is opened again within
// ~30 minutes, a live list (products, supplier costs, orders ...) only pays for the documents that changed since, not
// all of them again (a team Admin load was ~800 reads every time; Spark gives 50,000 a day). Must run before any
// getFirestore() call, so every file that uses Firestore imports "./firebase" first. Without IndexedDB (some private
// windows) Firestore falls back to the normal in-memory cache by itself.
try {
  initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) { /* already set up (hot reload in dev) */ }
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Google always shows the account chooser, so customers, sellers and the team can switch accounts
// (without it Google signs in with the last account straight away)
googleProvider.setCustomParameters({ prompt: 'select_account' });
