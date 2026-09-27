/* ==================================================
   COLLABFLOW — SHARED RUNTIME
   Loaded on every page after firebase-init.js.
   Provides: auth state, CRUD helpers, toasts, modals,
   confirm dialogs, header/nav rendering, demo-mode data.
================================================== */

(function () {
  const CF = window.CF;

  // ---------- DEMO DATA (used only when Firestore has no live docs yet,
  // or when Firebase failed to initialize) ----------
  CF.DEMO = {
    website: {
      heroHeading: "Where brands and creators actually get things done",
      heroDescription: "CollabFlow is the managed workspace behind every jersey drop, product post and campaign — brands post what they need, creators apply, we coordinate the rest.",
      heroImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop",
      brandHubHeading: "Brand Hub",
      brandHubDescription: "Live campaigns brands are running right now.",
      creatorHubHeading: "Creator Hub",
      creatorHubDescription: "Creators approved and ready to collaborate.",
      aboutHeading: "One team coordinating both sides of the deal",
      aboutDescription: "CollabFlow is an agency-managed platform, not an open marketplace. Every brand and every creator is reviewed before anything goes public, and every collaboration is coordinated by our team from first message to delivery."
    },
    rules: [
      { text: "Share accurate campaign or profile information — CollabFlow reviews everything before it goes live." },
      { text: "Content requirements, deadlines and deliverables should be agreed in writing before work starts." },
      { text: "Payment terms are confirmed through CollabFlow before a collaboration is marked accepted." },
      { text: "Communicate professionally — CollabFlow moderates and can pause a listing at any time." }
    ],
    campaigns: [
      {
        id: "demo-camp-1", brandName: "Ridgeline Sportswear", campaignName: "Monsoon Jersey Drop",
        description: "Reels showing the new jersey in daily wear, not just on-pitch.", coverImage: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?q=80&w=800&auto=format&fit=crop",
        budgetType: "Range", budget: "₹3,000 – ₹7,000", contentTypes: ["Reel"], platforms: ["Instagram"],
        deadline: "2026-10-20", location: "Mumbai", requirements: "Feature the crest close-up in the first 2 seconds.",
        publicStatus: true, isDemo: true
      },
      {
        id: "demo-camp-2", brandName: "Northfield Foods", campaignName: "Office Lunch Series",
        description: "Short UGC-style clips of the ready-meal range at a work desk.", coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
        budgetType: "Fixed", budget: "₹4,500", contentTypes: ["UGC", "Reel"], platforms: ["Instagram", "YouTube"],
        deadline: "2026-11-05", location: "Remote", requirements: "Casual tone, no scripted voiceover.",
        publicStatus: true, isDemo: true
      },
      {
        id: "demo-camp-3", brandName: "Alta Skincare", campaignName: "Winter Routine Story",
        description: "A 3-story arc showing the routine morning and night.", coverImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=800&auto=format&fit=crop",
        budgetType: "Negotiable", budget: "Negotiable", contentTypes: ["Story"], platforms: ["Instagram"],
        deadline: "2026-10-12", location: "Bengaluru", requirements: "Natural lighting, no heavy filters.",
        publicStatus: true, isDemo: true
      }
    ],
    creators: [
      {
        id: "demo-cr-1", name: "Meher Kaul", username: "@meherkaul", category: "Fashion", platforms: ["Instagram"],
        followers: 42000, location: "Delhi", bio: "Streetwear and jersey styling, four drops a month.",
        profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
        rates: { reel: 5000, story: 1500, post: 2500 }, publicStatus: true, isDemo: true
      },
      {
        id: "demo-cr-2", name: "Arav Sen", username: "@aravsen", category: "Food", platforms: ["Instagram", "YouTube"],
        followers: 18500, location: "Pune", bio: "Home-cook style food content, no studio setup.",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
        rates: { reel: 3000, story: 900, post: 1800 }, publicStatus: true, isDemo: true
      },
      {
        id: "demo-cr-3", name: "Ishita Rao", username: "@ishitarao", category: "Beauty", platforms: ["Instagram"],
        followers: 76000, location: "Bengaluru", bio: "Skincare-first beauty content, dermat-reviewed captions.",
        profileImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600&auto=format&fit=crop",
        rates: { reel: 8000, story: 2200, post: 4000 }, publicStatus: true, isDemo: true
      }
    ]
  };

  // ---------- TOASTS ----------
  CF.toast = function (message, type) {
    let stack = document.getElementById("toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  };

  // ---------- MODALS ----------
  CF.openModal = function (id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add("open"); document.body.style.overflow = "hidden"; }
  };
  CF.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove("open"); document.body.style.overflow = ""; }
  };
  document.addEventListener("click", (e) => {
    if (e.target.classList && e.target.classList.contains("modal-overlay")) {
      e.target.classList.remove("open");
      document.body.style.overflow = "";
    }
  });

  // generic confirm dialog, built on demand
  CF.confirmAction = function (message, onConfirm) {
    let overlay = document.getElementById("cf-confirm-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "cf-confirm-overlay";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-box" style="max-width:400px">
          <h3 id="cf-confirm-msg">Are you sure?</h3>
          <p class="help-text" style="margin-bottom:18px">This action cannot be undone.</p>
          <div style="display:flex;gap:10px">
            <button class="btn btn-ghost btn-block" id="cf-confirm-cancel">Cancel</button>
            <button class="btn btn-danger btn-block" id="cf-confirm-ok">Confirm</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector("#cf-confirm-msg").textContent = message;
    const okBtn = overlay.querySelector("#cf-confirm-ok");
    const cancelBtn = overlay.querySelector("#cf-confirm-cancel");
    const newOk = okBtn.cloneNode(true);
    okBtn.replaceWith(newOk);
    newOk.addEventListener("click", () => {
      overlay.classList.remove("open");
      onConfirm();
    });
    cancelBtn.onclick = () => overlay.classList.remove("open");
    overlay.classList.add("open");
  };

  // ---------- FORMAT HELPERS ----------
  CF.formatINR = function (n) {
    if (n === undefined || n === null || n === "") return "—";
    if (isNaN(n)) return n; // already a string like "Negotiable"
    return "₹" + Number(n).toLocaleString("en-IN");
  };
  CF.debounce = function (fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait || 250); };
  };
  CF.escapeHtml = function (str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };

  // ---------- AUTH ----------
  CF.currentUser = null; // { uid, email, role, profile }
  CF._authReady = false;
  CF._authListeners = [];
  CF.onAuthReady = function (cb) {
    if (CF._authReady) cb(CF.currentUser);
    else CF._authListeners.push(cb);
  };

  async function loadUserProfile(uid) {
    const snap = await CF.db.collection("users").doc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  if (CF.DEMO_MODE) {
    CF._authReady = true;
  } else {
    CF.auth.onAuthStateChanged(async (user) => {
      if (user) {
        let profile = null;
        try { profile = await loadUserProfile(user.uid); } catch (e) { console.error(e); }
        CF.currentUser = { uid: user.uid, email: user.email, role: profile ? profile.role : null, status: profile ? profile.status : null };
      } else {
        CF.currentUser = null;
      }
      CF._authReady = true;
      CF._authListeners.forEach((cb) => cb(CF.currentUser));
      CF._authListeners = [];
      CF.renderAuthNav && CF.renderAuthNav();
    });
  }

  CF.signUp = async function (email, password, role, extra) {
    if (CF.DEMO_MODE) throw new Error("Demo Mode: connect Firebase to create real accounts.");
    const cred = await CF.auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    await CF.db.collection("users").doc(uid).set({
      uid, email, role, status: "PENDING", createdAt: CF.FieldValue.serverTimestamp()
    });
    if (role === "BRAND") {
      await CF.db.collection("brands").doc(uid).set({
        ownerUid: uid, name: extra.name || "", email, mobile: "", website: "", socialLinks: "",
        category: "", location: "", description: "", logo: "", cover: "",
        status: "PENDING", publicStatus: false, createdAt: CF.FieldValue.serverTimestamp(), updatedAt: CF.FieldValue.serverTimestamp()
      });
    } else if (role === "CREATOR") {
      await CF.db.collection("creators").doc(uid).set({
        ownerUid: uid, name: extra.name || "", username: extra.username || "", privateEmail: email, privatePhone: "",
        bio: "", categories: [], platforms: [], followers: 0, location: "", profileImage: "", coverImage: "",
        rates: { reel: 0, story: 0, post: 0 }, packages: [],
        status: "DRAFT", publicStatus: false, createdAt: CF.FieldValue.serverTimestamp(), updatedAt: CF.FieldValue.serverTimestamp()
      });
    }
    return uid;
  };

  CF.signIn = function (email, password) {
    if (CF.DEMO_MODE) throw new Error("Demo Mode: connect Firebase to sign in.");
    return CF.auth.signInWithEmailAndPassword(email, password);
  };

  CF.signOutUser = function () {
    if (!CF.DEMO_MODE) CF.auth.signOut();
    window.location.href = "index.html";
  };

  // Guard used at the top of admin.html / brands.html / creator.html.
  // Shows the built-in #cf-access-screen and hides #cf-panel-app until authorized.
  CF.requireRole = function (allowedRoles) {
    const accessScreen = document.getElementById("cf-access-screen");
    const panelApp = document.getElementById("cf-panel-app");
    CF.onAuthReady((user) => {
      if (CF.DEMO_MODE) {
        // Demo Mode: let people preview the panel UI, clearly labelled.
        if (panelApp) panelApp.style.display = "";
        if (accessScreen) accessScreen.style.display = "none";
        CF.toast("Demo Mode — connect Firebase for real accounts.", "warn");
        return;
      }
      if (user && allowedRoles.includes(user.role)) {
        if (panelApp) panelApp.style.display = "";
        if (accessScreen) accessScreen.style.display = "none";
      } else {
        if (panelApp) panelApp.style.display = "none";
        if (accessScreen) accessScreen.style.display = "";
      }
    });
  };

  // ---------- FIRESTORE CRUD ----------
  CF.getCollection = async function (name, opts) {
    opts = opts || {};
    if (CF.DEMO_MODE) return CF.DEMO[name] ? CF.DEMO[name].slice() : [];
    let ref = CF.db.collection(name);
    if (opts.where) opts.where.forEach((w) => { ref = ref.where(w[0], w[1], w[2]); });
    if (opts.orderBy) ref = ref.orderBy(opts.orderBy);
    try {
      const snap = await ref.get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (rows.length === 0 && opts.fallbackDemo && CF.DEMO[name]) return CF.DEMO[name].slice();
      return rows;
    } catch (err) {
      console.error("Firestore read failed for " + name, err);
      return opts.fallbackDemo && CF.DEMO[name] ? CF.DEMO[name].slice() : [];
    }
  };

  CF.getDoc = async function (path, fallback) {
    if (CF.DEMO_MODE) return fallback || null;
    try {
      const [col, id] = path.split("/");
      const snap = await CF.db.collection(col).doc(id).get();
      return snap.exists ? snap.data() : fallback || null;
    } catch (err) {
      console.error("Firestore doc read failed for " + path, err);
      return fallback || null;
    }
  };

  CF.setDoc = async function (col, id, data, merge) {
    if (CF.DEMO_MODE) { CF.toast("Demo Mode — connect Firebase for permanent live storage.", "warn"); return; }
    data.updatedAt = CF.FieldValue.serverTimestamp();
    await CF.db.collection(col).doc(id).set(data, { merge: merge !== false });
  };

  CF.addDoc = async function (col, data) {
    if (CF.DEMO_MODE) { CF.toast("Demo Mode — connect Firebase for permanent live storage.", "warn"); return "demo-id"; }
    data.createdAt = CF.FieldValue.serverTimestamp();
    data.updatedAt = CF.FieldValue.serverTimestamp();
    const ref = await CF.db.collection(col).add(data);
    return ref.id;
  };

  CF.updateDoc = async function (col, id, data) {
    if (CF.DEMO_MODE) { CF.toast("Demo Mode — connect Firebase for permanent live storage.", "warn"); return; }
    data.updatedAt = CF.FieldValue.serverTimestamp();
    await CF.db.collection(col).doc(id).update(data);
  };

  CF.deleteDoc = async function (col, id) {
    if (CF.DEMO_MODE) { CF.toast("Demo Mode — connect Firebase for permanent live storage.", "warn"); return; }
    await CF.db.collection(col).doc(id).delete();
  };

  // Uploads a File to Firebase Storage under `path` and returns the download URL.
  CF.uploadImage = async function (file, path) {
    if (CF.DEMO_MODE) throw new Error("Demo Mode: connect Firebase Storage to upload images.");
    const ref = CF.storage.ref().child(path + "/" + Date.now() + "-" + file.name);
    await ref.put(file);
    return await ref.getDownloadURL();
  };

  // ---------- HEADER / NAV AUTH STATE (public site) ----------
  CF.renderAuthNav = function () {
    const slot = document.getElementById("nav-auth-slot");
    const drawerSlot = document.getElementById("drawer-auth-slot");
    if (!slot) return;
    const u = CF.currentUser;
    let html;
    if (CF.DEMO_MODE || !u) {
      html = `<button class="btn btn-ghost btn-sm" onclick="CF.openModal('auth-modal')">Log in</button>
              <button class="btn btn-primary btn-sm" onclick="CF.openModal('auth-modal')">Get started</button>`;
    } else {
      const panel = u.role === "ADMIN" ? "admin.html" : u.role === "BRAND" ? "brands.html" : "creator.html";
      html = `<a class="btn btn-secondary btn-sm" href="${panel}">${u.role === "ADMIN" ? "Admin Panel" : u.role === "BRAND" ? "Brands Panel" : "Creator Panel"}</a>
              <button class="btn btn-ghost btn-sm" onclick="CF.signOutUser()">Log out</button>`;
    }
    slot.innerHTML = html;
    if (drawerSlot) drawerSlot.innerHTML = html;
  };

  CF.toggleDrawer = function () {
    document.getElementById("mobile-drawer").classList.toggle("open");
  };

  CF.togglePanelDrawer = function () {
    document.getElementById("panel-sidebar").classList.toggle("open-mobile");
  };

  document.addEventListener("DOMContentLoaded", () => {
    CF.renderAuthNav();
    // demo-mode banner, if present on the page
    const banner = document.getElementById("mode-banner");
    if (banner) {
      if (CF.DEMO_MODE) { banner.textContent = "Demo Mode — showing sample data. Connect Firebase for live data."; banner.classList.remove("live"); }
      else { banner.textContent = "Live Mode — connected to Firebase."; banner.classList.add("live"); }
    }
  });
})();
