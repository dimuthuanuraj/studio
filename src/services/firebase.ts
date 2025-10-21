
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
  apiKey: "AIzaSyDphljo1GKvq4P8DlexrEqXsMDVdIN5ojQ",
  authDomain: "voiceid-lanka.firebaseapp.com",
  projectId: "voiceid-lanka",
  storageBucket: "voiceid-lanka.firebasestorage.app",
  messagingSenderId: "202475807088",
  appId: "1:202475807088:web:7256b0df57356798a96fb5"
};


// Initialize Firebase
// The following line is a best practice for Next.js applications.
// It checks if a Firebase app has already been initialized to prevent errors during hot-reloading in development.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
