
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// VITAL: PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
//
// 1. Go to your Firebase project console.
// 2. In Project settings > General tab, find your app.
// 3. Copy the 'firebaseConfig' object and paste it below, replacing the placeholder.
//
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};


// Initialize Firebase
// The following line is a best practice for Next.js applications.
// It checks if a Firebase app has already been initialized to prevent errors during hot-reloading in development.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
