import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAM-79czH_M0eT_WKnc7o5HhRHmaDHXNXc",
  authDomain: "collabflow-5f472.firebaseapp.com",
  projectId: "collabflow-5f472",
  storageBucket: "collabflow-5f472.firebasestorage.app",
  messagingSenderId: "86204056814",
  appId: "1:86204056814:web:e7d79b5b7c0fd03e439fff",
  measurementId: "G-N5D4GL9Z34"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
