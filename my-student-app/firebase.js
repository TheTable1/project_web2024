import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrjydWmT19vEJu6zvsJCZk-iLg5P9G_9c",
  authDomain: "web2567teungteung.firebaseapp.com",
  projectId: "web2567teungteung",
  storageBucket: "web2567teungteung.firebasestorage.app",
  messagingSenderId: "472898800755",
  appId: "1:472898800755:web:b861572160a6ca34a4ae06",
  measurementId: "G-LVKQEQ5Z67",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  firebaseConfig,
  app,
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
};
