import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

let auth: Auth;
try {
  const { getReactNativePersistence } = require("firebase/auth/react-native");
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
