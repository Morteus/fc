import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  Auth, // <-- Import the Auth type
  initializeAuth,
  // indexedDBLocalPersistence, // <-- Not needed for React Native
  // browserLocalPersistence, // <-- Not needed for React Native
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBk2pWB6UPcYCvuMvYb15p3A1oqR7vNw8w",
  authDomain: "finclassify-bc2fe.firebaseapp.com",
  projectId: "finclassify-bc2fe",
  storageBucket: "finclassify-bc2fe.appspot.com",
  messagingSenderId: "523821328429",
  appId: "1:523821328429:web:50ebf34664809476fdf0a4",
  measurementId: "G-617DDCKYHT",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
// React Native specific approach
let auth: Auth; // <-- Explicitly type auth as Auth
try {
  // Try to use React Native specific persistence
  const { getReactNativePersistence } = require("firebase/auth/react-native");
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Fallback to standard auth if React Native persistence is not available
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
