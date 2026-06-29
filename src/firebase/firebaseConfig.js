/**
 * firebaseConfig.js
 * -----------------
 * This file sets up the connection to Firebase.
 * Firebase is our backend — it stores products, bills, and handles login.
 * 
 * HOW TO USE:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (e.g., "sri-narayana-traders")
 * 3. Enable Firestore Database (in test mode for development)
 * 4. Enable Authentication → Email/Password sign-in method
 * 5. Go to Project Settings → Your Apps → Add Web App
 * 6. Copy the config values and paste them below
 */

// Import the Firebase modules we need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSCs4FMkfZu-_3pQMnRwOOLmJmTx8Wl8o",
  authDomain: "sri-narayana-traders-backend.firebaseapp.com",
  projectId: "sri-narayana-traders-backend",
  storageBucket: "sri-narayana-traders-backend.firebasestorage.app",
  messagingSenderId: "986177428263",
  appId: "1:986177428263:web:a43d08d110d20540026702",
  measurementId: "G-DVQP3WWKBC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export so other files can use db and auth
export { db, auth };
