import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
