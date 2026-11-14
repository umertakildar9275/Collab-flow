import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, addDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { bindLogout, showMessage, friendlyError, escapeHtml, safeUrl } from "./common.js";

bindLogout();
let adminUser = null;
const pendingEl = document.getElementById("pending-list");
const publishedEl = document.getElementById("admin-published");
onAuthStateChanged(auth, async user => {
  if (!user) return location.replace("./login.html");
  adminUser = user;
  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));
    if (!adminSnap.exists() || adminSnap.data().active !== true) {
      document.querySelector("main").innerHTML = '<section class="panel access-denied"><h1>Admin access required</h1><p>This account is not authorized as a CollabFlow administrator.</p><a class="btn" href="./dashboard.html">Go to dashboard</a></section>';
      return;
    }
    startListeners();
  } catch (error) {
    document.querySelector("main").innerHTML = `<section class="panel access-denied"><h1>Could not verify admin access</h1><p>${escapeHtml(friendlyError(error))}</p></section>`;
  }
});

function startListeners() {
  const pendingQuery = query(collection(db, "submissions"), where("status", "==", "pending"), orderBy("createdAt", "asc"));
  onSnapshot(pendingQuery, snap => {
    document.getElementById("pending-count").textContent = snap.size;
    pendingEl.innerHTML = snap.empty ? '<div class="empty-state">No pending submissions. You are all caught up.</div>' : snap.docs.map(s => submissionCard(s.id, s.data())).join("");
    pendingEl.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", () => approveSubmission(b.dataset.approve)));
    pendingEl.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", () => rejectSubmission(b.dataset.reject)));
  }, err => { pendingEl.innerHTML = `<div class="empty-state">${escapeHtml(friendlyError(err))}</div>`; });
  const publishedQuery = query(collection(db, "publicProfiles"), where("status", "==", "published"), orderBy("createdAt", "desc"));
  onSnapshot(publishedQuery, snap => {
    publishedEl.innerHTML = snap.empty ? '<div class="empty-state">No profiles published yet.</div>' : snap.docs.map(s => {
      const p = s.data();
      return `<div class="admin-row"><div><strong>${escapeHtml(p.displayName)}</strong><p>${escapeHtml((p.type || "creator").toUpperCase())} · ${escapeHtml(p.niche || "")}</p></div><button class="btn btn-danger btn-small" data-delete="${s.id}">Unpublish</button></div>`;
    }).join("");
    publishedEl.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => unpublish(b.dataset.delete)));
  }, err => { publishedEl.innerHTML = `<div class="empty-state">${escapeHtml(friendlyError(err))}</div>`; });
}
function submissionCard(id, p) {
  const image = safeUrl(p.imageUrl);
  return `<article class="submission-card">
    <div class="submission-title"><div>${image ? `<img class="avatar" src="${escapeHtml(image)}" alt="">` : `<div class="avatar avatar-placeholder">${escapeHtml((p.displayName||"?").slice(0,1))}</div>`}<div><strong>${escapeHtml(p.displayName)}</strong><p>${escapeHtml((p.type||"creator").toUpperCase())} · ${escapeHtml(p.ownerEmail||"")}</p></div></div><span class="type-pill">PENDING</span></div>
    <p class="profile-headline">${escapeHtml(p.headline||"")}</p><p>${escapeHtml(p.bio||"")}</p><div class="profile-meta"><span>${escapeHtml(p.niche||"")}</span><span>${escapeHtml(p.location||"")}</span></div>
    <div class="profile-links">${p.website ? `<a href="${escapeHtml(safeUrl(p.website))}" target="_blank" rel="noopener">Website ↗</a>` : ""}${p.social ? `<a href="${escapeHtml(safeUrl(p.social))}" target="_blank" rel="noopener">Social ↗</a>` : ""}</div>
    <div class="review-actions"><button class="btn btn-small" data-approve="${id}">Approve & publish</button><button class="btn btn-small btn-danger" data-reject="${id}">Reject</button></div>
  </article>`;
}
async function approveSubmission(id) {
  try {
    const ref = doc(db, "submissions", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const p = snap.data();
    await addDoc(collection(db, "publicProfiles"), {
      type: p.type, displayName: p.displayName, headline: p.headline, bio: p.bio, niche: p.niche,
      location: p.location || "", website: p.website || "", social: p.social || "", imageUrl: p.imageUrl || "",
      ownerUid: p.ownerUid, sourceSubmissionId: id, status: "published",
      createdAt: serverTimestamp(), publishedAt: serverTimestamp()
    });
    await updateDoc(ref, { status: "approved", reviewedAt: serverTimestamp(), reviewedBy: adminUser.uid, adminNote: "Your profile has been approved and published." });
  } catch (e) { alert(friendlyError(e)); }
}
async function rejectSubmission(id) {
  const note = prompt("Reason / changes required (shown to the submitter):", "Please update your profile details and submit again.");
  if (note === null) return;
  try { await updateDoc(doc(db, "submissions", id), { status: "rejected", adminNote: note.slice(0,500), reviewedAt: serverTimestamp(), reviewedBy: adminUser.uid }); }
  catch (e) { alert(friendlyError(e)); }
}
async function unpublish(id) {
  if (!confirm("Unpublish this profile from the public directory?")) return;
  try { await updateDoc(doc(db, "publicProfiles", id), { status: "unpublished", unpublishedAt: serverTimestamp() }); }
  catch (e) { alert(friendlyError(e)); }
}

document.getElementById("admin-profile-form").addEventListener("submit", async e => {
  e.preventDefault();
  const val = id => document.getElementById(id).value.trim();
  const data = { type:val("admin-type"), displayName:val("admin-name"), headline:val("admin-headline"), niche:val("admin-niche"), location:val("admin-location"), website:val("admin-website"), social:val("admin-social"), imageUrl:val("admin-image"), bio:val("admin-bio"), ownerUid:adminUser.uid, status:"published", createdAt:serverTimestamp(), publishedAt:serverTimestamp(), createdBy:adminUser.uid };
  const msg = document.getElementById("admin-message");
  try { await addDoc(collection(db,"publicProfiles"), data); e.target.reset(); showMessage(msg,"Profile published. It is now visible on the public website."); }
  catch(error) { showMessage(msg,friendlyError(error),true); }
});
