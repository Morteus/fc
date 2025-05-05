// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBk2pWB6UPcYCvuMvYb15p3A1oqR7vNw8w",
  authDomain: "finclassify-bc2fe.firebaseapp.com",
  projectId: "finclassify-bc2fe",
  storageBucket: "finclassify-bc2fe.firebasestorage.app",
  messagingSenderId: "523821328429",
  appId: "1:523821328429:web:50ebf34664809476fdf0a4",
  measurementId: "G-617DDCKYHT",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
