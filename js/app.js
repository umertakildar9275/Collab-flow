import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

console.info("CollabFlow frontend loaded.");
console.info("Connected Firebase project:", db.app.options.projectId);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.info("Signed-in Firebase user:", user.uid);
    console.info("Email verified:", user.emailVerified);
  } else {
    console.info("No user is currently signed in.");
  }
});
