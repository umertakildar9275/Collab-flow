import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { bindLogout, showMessage, friendlyError, escapeHtml, watchUser } from "./common.js";

bindLogout();
const form = document.getElementById("profile-form");
const msg = document.getElementById("profile-message");
let currentUser = null, accountRole = "creator";
watchUser(async user => {
  if (!user) return location.replace("./login.html");
  currentUser = user;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) throw new Error("Your account record is missing. Please sign out and sign in again.");
    const data = snap.data();
    accountRole = data.role === "brand" ? "brand" : "creator";
    document.getElementById("welcome-name").textContent = data.displayName || user.displayName || "there";
    document.getElementById("account-role").textContent = accountRole.toUpperCase() + " ACCOUNT";
    document.getElementById("display-name-label").firstChild.textContent = accountRole === "brand" ? "Brand name" : "Creator name";
    document.getElementById("niche-label").firstChild.textContent = accountRole === "brand" ? "Industry" : "Niche";
    const q = query(collection(db, "submissions"), where("ownerUid", "==", user.uid), orderBy("createdAt", "desc"), limit(1));
    onSnapshot(q, s => renderStatus(s));
  } catch (error) { showMessage(msg, friendlyError(error), true); }
});

function renderStatus(snapshot) {
  const el = document.getElementById("submission-status");
  if (snapshot.empty) { el.innerHTML = '<span class="status-dot draft"></span><strong>No submission yet</strong><p>Complete the form to submit your profile for review.</p>'; return; }
  const d = snapshot.docs[0].data();
  const status = d.status || "pending";
  const labels = { pending:"Waiting for admin review", approved:"Approved and published", rejected:"Needs changes" };
  el.innerHTML = `<span class="status-dot ${escapeHtml(status)}"></span><strong>${escapeHtml(labels[status] || status)}</strong><p>${escapeHtml(d.adminNote || (status === "approved" ? "Your profile is visible on the public website." : status === "rejected" ? "Please update your details and submit again." : "Your profile is private until approved."))}</p>`;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const val = id => document.getElementById(id).value.trim();
  const profile = {
    ownerUid: currentUser.uid,
    ownerEmail: currentUser.email || "",
    type: accountRole,
    displayName: val("displayName"),
    headline: val("headline"),
    bio: val("bio"),
    niche: val("niche"),
    location: val("location"),
    website: val("website"),
    social: val("social"),
    imageUrl: val("imageUrl"),
    status: "pending",
    adminNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  showMessage(msg, "Submitting your profile…");
  try {
    await addDoc(collection(db, "submissions"), profile);
    showMessage(msg, "Submitted successfully. Your profile is now waiting for admin review.");
    form.reset();
  } catch (error) { showMessage(msg, friendlyError(error), true); }
});
