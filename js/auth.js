import { auth, db, googleProvider } from "./firebase.js";
import { showMessage, friendlyError } from "./common.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const message = document.getElementById("auth-message");
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

async function ensureUserDocument(user, name="", role="creator") {
  const userRef = doc(db, "users", user.uid);
  const existing = await (await import("https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js")).getDoc(userRef);
  if (existing.exists()) return; // Never overwrite a user's chosen account type on later Google logins.
  await setDoc(userRef, {
    uid: user.uid,
    displayName: name || user.displayName || user.email?.split("@")[0] || "Member",
    email: user.email || "",
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
function goToWorkspace() { location.href = "./dashboard.html"; }

signupForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  showMessage(message, "Creating your account…");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await ensureUserDocument(credential.user, name, role);
    try { await sendEmailVerification(credential.user); } catch (e) { console.warn("Verification email could not be sent:", e); }
    showMessage(message, "Account created. Check your inbox for verification, then complete your profile.");
    window.setTimeout(goToWorkspace, 1200);
  } catch (error) { showMessage(message, friendlyError(error), true); }
});

loginForm?.addEventListener("submit", async e => {
  e.preventDefault();
  showMessage(message, "Signing you in…");
  try {
    const credential = await signInWithEmailAndPassword(auth, document.getElementById("email").value.trim(), document.getElementById("password").value);
    goToWorkspace();
  } catch (error) { showMessage(message, friendlyError(error), true); }
});

async function googleSignIn() {
  showMessage(message, "Opening Google sign-in…");
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    if (!signupForm) await ensureUserDocument(credential.user);
    else {
      const role = document.getElementById("role").value;
      await ensureUserDocument(credential.user, credential.user.displayName || "", role);
    }
    goToWorkspace();
  } catch (error) { showMessage(message, friendlyError(error), true); }
}
document.getElementById("google-login")?.addEventListener("click", googleSignIn);
document.getElementById("google-signup")?.addEventListener("click", googleSignIn);
document.getElementById("forgot-password")?.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return showMessage(message, "Enter your email address first.", true);
  try { await sendPasswordResetEmail(auth, email); showMessage(message, "Password reset email sent. Check your inbox."); }
  catch (error) { showMessage(message, friendlyError(error), true); }
});
