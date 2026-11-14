import { db } from "./firebase.js";
import { collection, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { escapeHtml, safeUrl } from "./common.js";

document.getElementById("year").textContent = new Date().getFullYear();
const container = document.getElementById("public-profiles");
const q = query(collection(db, "publicProfiles"), where("status", "==", "published"), orderBy("createdAt", "desc"));
onSnapshot(q, snapshot => {
  if (snapshot.empty) {
    container.innerHTML = '<div class="empty-state">Our community is growing. Approved profiles will appear here.</div>';
    return;
  }
  container.innerHTML = snapshot.docs.map(docSnap => {
    const p = docSnap.data();
    const image = safeUrl(p.imageUrl);
    const website = safeUrl(p.website);
    const social = safeUrl(p.social);
    const name = escapeHtml(p.displayName || "CollabFlow member");
    return `<article class="profile-card panel">
      <div class="profile-card-top"><span class="type-pill">${escapeHtml((p.type || "creator").toUpperCase())}</span>${image ? `<img class="avatar" src="${escapeHtml(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="avatar avatar-placeholder">${name.slice(0,1)}</div>`}</div>
      <h3>${name}</h3><p class="profile-headline">${escapeHtml(p.headline || "")}</p>
      <p class="profile-bio">${escapeHtml(p.bio || "")}</p>
      <div class="profile-meta">${p.niche ? `<span>${escapeHtml(p.niche)}</span>` : ""}${p.location ? `<span>${escapeHtml(p.location)}</span>` : ""}</div>
      <div class="profile-links">${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website ↗</a>` : ""}${social ? `<a href="${escapeHtml(social)}" target="_blank" rel="noopener noreferrer">Social ↗</a>` : ""}</div>
    </article>`;
  }).join("");
}, error => {
  console.error("Could not load public profiles:", error);
  container.innerHTML = '<div class="empty-state">Could not load profiles. Check Firestore rules and indexes.</div>';
});
