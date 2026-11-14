
import { auth, db, googleProvider } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const message = document.getElementById("auth-message");

function showMessage(text, error = false) {
  if (!message) return;
  message.textContent = text;
  message.classList.toggle("error", error);
}

function getFriendlyError(error) {
  const errors = {
    "auth/email-already-in-use": "Email already registered.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/invalid-email": "Please enter a valid email.",
    "auth/unauthorized-domain": "Domain is not authorized in Firebase.",
    "auth/operation-not-allowed": "Enable this login provider in Firebase.",
    "auth/popup-blocked": "Please use Google redirect login.",
    "permission-denied": "Firestore permission denied. Check security rules."
  };

  return errors[error.code] || error.message || "Something went wrong.";
}

async function ensureUserDocument(user, name = "", role = "creator") {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    return;
  }

  await setDoc(userRef, {
    uid: user.uid,
    displayName:
      name ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "Member",
    email: user.email || "",
    role: role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function goToDashboard() {
  window.location.replace("./dashboard.html");
}

// EMAIL SIGNUP

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  showMessage("Creating your account...");

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(result.user, {
      displayName: name
    });

    await ensureUserDocument(result.user, name, role);

    try {
      await sendEmailVerification(result.user);
    } catch (verificationError) {
      console.warn(verificationError);
    }

    showMessage("Account created successfully!");
    setTimeout(goToDashboard, 1000);

  } catch (error) {
    showMessage(getFriendlyError(error), true);
  }
});

// EMAIL LOGIN

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  showMessage("Signing you in...");

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await ensureUserDocument(result.user);
    goToDashboard();

  } catch (error) {
    showMessage(getFriendlyError(error), true);
  }
});

// GOOGLE REDIRECT LOGIN / SIGNUP

async function googleSignIn() {
  try {
    if (signupForm) {
      const role = document.getElementById("role").value;
      sessionStorage.setItem("collabflow_google_role", role);
      sessionStorage.setItem("collabflow_google_mode", "signup");
    } else {
      sessionStorage.setItem("collabflow_google_mode", "login");
    }

    showMessage("Redirecting to Google...");

    await signInWithRedirect(auth, googleProvider);

  } catch (error) {
    sessionStorage.removeItem("collabflow_google_role");
    sessionStorage.removeItem("collabflow_google_mode");
    showMessage(getFriendlyError(error), true);
  }
}

document
  .getElementById("google-login")
  ?.addEventListener("click", googleSignIn);

document
  .getElementById("google-signup")
  ?.addEventListener("click", googleSignIn);

// HANDLE GOOGLE REDIRECT RESULT

async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);

    if (!result) return;

    const mode = sessionStorage.getItem("collabflow_google_mode");
    const role =
      sessionStorage.getItem("collabflow_google_role") || "creator";

    await ensureUserDocument(
      result.user,
      result.user.displayName || "",
      mode === "signup" ? role : "creator"
    );

    sessionStorage.removeItem("collabflow_google_role");
    sessionStorage.removeItem("collabflow_google_mode");

    goToDashboard();

  } catch (error) {
    showMessage(getFriendlyError(error), true);
    console.error("Google redirect error:", error);
  }
}

handleGoogleRedirect();

// FORGOT PASSWORD

document
  .getElementById("forgot-password")
  ?.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();

    if (!email) {
      showMessage("Enter your email address first.", true);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset email sent. Check your inbox.");

    } catch (error) {
      showMessage(getFriendlyError(error), true);
    }
  });
