// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// ✅ Environment config
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ✅ Diagnostics
if (typeof window !== "undefined") {
  console.log("Spark env check:", {
    apiKey_present: !!cfg.apiKey,
    authDomain_present: !!cfg.authDomain,
    databaseURL_present: !!cfg.databaseURL,
    projectId_present: !!cfg.projectId,
    storageBucket_present: !!cfg.storageBucket,
    messagingSenderId_present: !!cfg.messagingSenderId,
    appId_present: !!cfg.appId,
  });
}

// ✅ Validate required env vars
for (const [k, v] of Object.entries(cfg)) {
  if (!v) throw new Error(`Missing env: ${k} (check .env.local and restart dev server)`);
}

// ✅ Init Firebase
const app = getApps().length ? getApp() : initializeApp(cfg);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// ✅ Automatic Anonymous Sign-In
if (typeof window !== "undefined") {
  if (!auth.currentUser) {
    signInAnonymously(auth)
      .then(() => console.log("[Firebase] Signed in anonymously:", auth.currentUser?.uid))
      .catch((err) => console.error("[Firebase Auth Error]", err));
  } else {
    console.log("[Firebase] Already signed in:", auth.currentUser?.uid);
  }
}
