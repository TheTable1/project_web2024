import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDrjydWmT19vEJu6zvsJCZk-iLg5P9G_9c",
    authDomain: "web2567teungteung.firebaseapp.com",
    projectId: "web2567teungteung",
    storageBucket: "web2567teungteung.firebasestorage.app",
    messagingSenderId: "472898800755",
    appId: "1:472898800755:web:b861572160a6ca34a4ae06",
    measurementId: "G-LVKQEQ5Z67",
  };

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // เพิ่ม Firestore

// 🔹 ฟังก์ชันสร้าง reCAPTCHA
export const configureRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };
