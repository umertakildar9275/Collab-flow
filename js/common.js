import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function showMessage(element, message, isError=false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}
export function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3200);
}
export function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
export function safeUrl(value="") {
  try { const u = new URL(value); return ["http:","https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; }
}
export function watchUser(callback) {
  return onAuthStateChanged(auth, callback);
}
export async function isAdmin(user) {
  if (!user) return false;
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists() && snap.data()?.active === true;
}
export async function logout() {
  await signOut(auth);
  location.href = "./index.html";
}
export function bindLogout() {
  document.getElementById("logout")?.addEventListener("click", async () => {
    try { await logout(); } catch (e) { toast(e.message); }
  });
}
export function friendlyError(error) {
  const map = {
    "auth/email-already-in-use":"This email is already registered.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/weak-password":"Use a stronger password (at least 8 characters).",
    "auth/invalid-email":"Enter a valid email address.",
    "auth/too-many-requests":"Too many attempts. Try again later.",
    "permission-denied":"Permission denied. Check the published Firestore rules and admin setup."
  };
  return map[error?.code] || error?.message || "Something went wrong. Please try again.";
}
