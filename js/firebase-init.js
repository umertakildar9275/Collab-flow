/* ==================================================
   FIREBASE INITIALIZATION
   Uses the compat SDK (loaded via <script> tags in each HTML page)
   so every page can share one plain global `firebase` object without
   a bundler. This file must be loaded AFTER the firebase-*-compat.js
   CDN scripts and BEFORE js/shared.js.
================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAM-79czH_M0eT_WKnc7o5HhRHmaDHXNXc",
  authDomain: "collabflow-5f472.firebaseapp.com",
  projectId: "collabflow-5f472",
  storageBucket: "collabflow-5f472.firebasestorage.app",
  messagingSenderId: "86204056814",
  appId: "1:86204056814:web:e7d79b5b7c0fd03e439fff",
  measurementId: "G-N5D4GL9Z34"
};

window.CF = window.CF || {};
window.CF.DEMO_MODE = false;

try {
  firebase.initializeApp(firebaseConfig);
  window.CF.auth = firebase.auth();
  window.CF.db = firebase.firestore();
  window.CF.storage = firebase.storage();
  window.CF.FieldValue = firebase.firestore.FieldValue;
} catch (err) {
  console.error("Firebase init failed, falling back to Demo Mode:", err);
  window.CF.DEMO_MODE = true;
}
