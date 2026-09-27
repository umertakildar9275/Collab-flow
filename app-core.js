/* ==================================================
   COLLABFLOW — SHARED CORE (loaded by every page)
   Plain classic script on purpose (no type="module") so that every object
   here (UI, Toast, Auth, session, ...) is a normal global the page's own
   inline onclick="" handlers can see. Using type="module" here was the bug
   behind "some errors" in the single-file version — module scripts are NOT
   visible to onclick attributes or other classic scripts, so buttons like
   onclick="UI.closeModal()" were failing silently. Dynamic import() still
   works fine inside a classic script, so we lose nothing by dropping it.
   ================================================== */

// Firebase Web App config — safe to ship client-side by design; real
// protection is Firestore/Storage Security Rules + Authentication, not this.
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyAM-79czH_M0eT_WKnc7o5HhRHmaDHXNXc",
  authDomain: "collabflow-5f472.firebaseapp.com",
  projectId: "collabflow-5f472",
  storageBucket: "collabflow-5f472.firebasestorage.app",
  messagingSenderId: "86204056814",
  appId: "1:86204056814:web:e7d79b5b7c0fd03e439fff",
  measurementId: "G-N5D4GL9Z34"
};

/* ---------- shared data caches (each page only fills what it needs) ---------- */
let siteSettings = { heroImage:"", brandHubCover:"", creatorHubCover:"", aboutHeading:"", aboutDescription:"", rules:[] };
let campaigns = [];               // public campaigns, publicStatus === true
let creators = [];                // public creators, publicStatus === true
let adminBrands = [], adminCreators = [], adminCampaigns = [], adminApplications = [], adminCollabRequests = [];
let brandOwnCampaigns = [], brandApplications = [], brandRequests = [];
let creatorApplications = [], creatorRequests = [];
let notifications = { ADMIN:[], BRAND:[], CREATOR:[] };

const session = { admin:false, brand:null, creator:null };
let connectionState = 'connecting'; // 'connecting' | 'live' | 'error'

/* ==================================================
   FIREBASE BOOTSTRAP — no offline/demo fallback. Every read/write below
   talks to the real Firebase project in window.__FIREBASE_CONFIG__.
   ================================================== */
const Backend = { app:null, auth:null, db:null, storage:null, authMod:null, fsMod:null, storageMod:null, ready:false };

async function bootstrap(){
  try{
    const [appMod, authMod, fsMod, storageMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js")
    ]);
    Backend.app = appMod.initializeApp(window.__FIREBASE_CONFIG__);
    Backend.auth = authMod.getAuth(Backend.app);
    Backend.db = fsMod.getFirestore(Backend.app);
    Backend.storage = storageMod.getStorage(Backend.app);
    Backend.authMod = authMod; Backend.fsMod = fsMod; Backend.storageMod = storageMod;
    Backend.ready = true;
    connectionState = 'live';
    UI.setAllModePills('live');
    ConnBanner.hide();
    if(typeof onBackendReady === 'function') onBackendReady();
    Backend.authMod.onAuthStateChanged(Backend.auth, handleAuthChange);
  }catch(e){
    console.error("Firebase initialization failed:", e);
    connectionState = 'error';
    UI.setAllModePills('error');
    ConnBanner.show();
    if(typeof onBackendError === 'function') onBackendError(e);
  }
}

function mapAuthError(e){
  const code = e && e.code || '';
  if(code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return "Invalid email or password.";
  if(code.includes('email-already-in-use')) return "An account already exists with that email.";
  if(code.includes('weak-password')) return "Password should be at least 6 characters.";
  if(code.includes('too-many-requests')) return "Too many attempts. Please try again later.";
  if(code.includes('network')) return "Unable to connect to CollabFlow. Please check your connection and try again.";
  return "Something went wrong. Please try again.";
}
function showErr(id,msg){ const el=document.getElementById(id); if(el){ el.style.display='block'; el.textContent=msg; } }
function hideErr(id){ const el=document.getElementById(id); if(el) el.style.display='none'; }

const ConnBanner = {
  show(){ const el=document.getElementById('globalConnError'); if(el) el.style.display='block'; },
  hide(){ const el=document.getElementById('globalConnError'); if(el) el.style.display='none'; }
};

/* ==================================================
   LISTENER REGISTRY — prevents duplicate onSnapshot listeners / leaks
   ================================================== */
const Listeners = {
  map:{},
  set(key,unsub){ this.clear(key); this.map[key]=unsub; },
  clear(key){ if(this.map[key]){ try{ this.map[key](); }catch(e){} delete this.map[key]; } },
  clearAll(){ Object.keys(this.map).forEach(k=>this.clear(k)); }
};

/* ==================================================
   PUBLIC LISTENERS — call only the ones a given page actually needs
   ================================================== */
function wireSiteSettings(){
  const {doc, onSnapshot} = Backend.fsMod;
  Listeners.set('siteSettings', onSnapshot(doc(Backend.db,'website','home'),
    snap=>{ if(snap.exists()) Object.assign(siteSettings, snap.data()); if(typeof applySiteSettingsToDom==='function') applySiteSettingsToDom(); },
    err=>console.error(err)));
}
function wirePublicCampaigns(onChange){
  const {collection, query, where, onSnapshot} = Backend.fsMod;
  Listeners.set('publicCampaigns', onSnapshot(
    query(collection(Backend.db,'campaigns'), where('publicStatus','==',true)),
    snap=>{ campaigns = snap.docs.map(d=>({id:d.id,...d.data()})); if(onChange) onChange(); },
    err=>{ console.error(err); Toast.show('Unable to connect to CollabFlow. Please check your connection and try again.','error'); }
  ));
}
function wirePublicCreators(onChange){
  const {collection, query, where, onSnapshot} = Backend.fsMod;
  Listeners.set('publicCreators', onSnapshot(
    query(collection(Backend.db,'creators'), where('publicStatus','==',true)),
    snap=>{ creators = snap.docs.map(d=>({id:d.id,...d.data()})); if(onChange) onChange(); },
    err=>{ console.error(err); Toast.show('Unable to connect to CollabFlow. Please check your connection and try again.','error'); }
  ));
}

/* ==================================================
   AUTH STATE — role is authoritative from Firestore users/{uid}.role,
   never from which page/URL you're on. Each page sets window.onAuthResolved
   to react (show its own login form / access-denied / app UI).
   ================================================== */
async function handleAuthChange(user){
  session.admin = false; session.brand = null; session.creator = null;
  Listeners.clearAll();
  // re-wire whichever public listeners this page originally asked for
  if(typeof rewirePublicListeners === 'function') rewirePublicListeners();
  if(!user){ if(window.onAuthResolved) window.onAuthResolved(null); return; }
  try{
    const {doc, getDoc} = Backend.fsMod;
    const uSnap = await getDoc(doc(Backend.db,'users',user.uid));
    if(!uSnap.exists()){
      Toast.show("Account not found.", 'error');
      await Backend.authMod.signOut(Backend.auth);
      return;
    }
    const role = uSnap.data().role;
    if(role === 'ADMIN'){ session.admin = true; }
    else if(role === 'BRAND'){
      const bSnap = await getDoc(doc(Backend.db,'brands',user.uid));
      session.brand = {id:user.uid, ...(bSnap.exists()?bSnap.data():{})};
    } else if(role === 'CREATOR'){
      const cSnap = await getDoc(doc(Backend.db,'creators',user.uid));
      session.creator = {id:user.uid, ...(cSnap.exists()?cSnap.data():{ rates:{reel:0,story:0,post:0,video:0,ugc:0}, packages:[], categories:[], platforms:[] })};
    }
    if(window.onAuthResolved) window.onAuthResolved(role);
  }catch(e){
    console.error(e);
    Toast.show("Unable to connect to CollabFlow. Please check your connection and try again.", 'error');
  }
}

/* ==================================================
   TOASTS
   ================================================== */
const Toast = {
  show(msg, type){
    const stack = document.getElementById('toastStack');
    if(!stack) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' '+type : '');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(()=>el.remove(), 3800);
  }
};

/* ==================================================
   GENERIC UI HELPERS / MODALS (shared across every page)
   ================================================== */
const UI = {
  toggleMobileMenu(open){ const el=document.getElementById('mobileMenu'); if(el) el.classList.toggle('open', open); },
  openModal(html){
    document.getElementById('genericModalBody').innerHTML = html;
    document.getElementById('genericModalOverlay').classList.add('open');
    document.body.style.overflow='hidden';
  },
  closeModal(){
    document.getElementById('genericModalOverlay').classList.remove('open');
    document.body.style.overflow='';
  },
  confirm(title, text, onConfirm){
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    const btn = document.getElementById('confirmActionBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', ()=>{ UI.closeConfirm(); onConfirm(); });
    document.getElementById('confirmOverlay').classList.add('open');
  },
  closeConfirm(){ document.getElementById('confirmOverlay').classList.remove('open'); },
  toggleAppSidebar(panel, open){
    const sb = document.getElementById(panel+'Sidebar'), ov = document.getElementById(panel+'DrawerOverlay');
    if(sb) sb.classList.toggle('open', open);
    if(ov) ov.classList.toggle('open', open);
  },
  escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  updateNotifDots(){
    const map = {adminNotifDot:'ADMIN', brandsNotifDot:'BRAND', creatorNotifDot:'CREATOR'};
    Object.entries(map).forEach(([id,role])=>{
      const el = document.getElementById(id);
      if(el) el.style.display = (notifications[role]||[]).some(n=>!n.read) ? 'block':'none';
    });
  },
  setAllModePills(state){
    const labelMap = {connecting:'Connecting…', live:'Live', error:'Connection error'};
    const classMap = {connecting:'mode-connecting', live:'mode-live', error:'mode-error'};
    ['adminModePill','brandsModePill','creatorModePill','footerModePill'].forEach(id=>{
      const el = document.getElementById(id); if(!el) return;
      el.textContent = labelMap[state]; el.className = 'mode-pill ' + classMap[state];
    });
  }
};
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ UI.closeModal(); UI.closeConfirm(); } });
document.addEventListener('DOMContentLoaded', ()=>{
  const gm = document.getElementById('genericModalOverlay');
  const cf = document.getElementById('confirmOverlay');
  if(gm) gm.addEventListener('click', e=>{ if(e.target.id==='genericModalOverlay') UI.closeModal(); });
  if(cf) cf.addEventListener('click', e=>{ if(e.target.id==='confirmOverlay') UI.closeConfirm(); });
});

/* ==================================================
   SMALL FORM HELPERS shared by every page's checkbox-pill filters/forms
   ================================================== */
function pill(group,label,checked){
  return `<label class="checkbox-pill${checked?' checked':''}"><input type="checkbox" data-group="${group}" value="${label}" ${checked?'checked':''} onchange="this.parentNode.classList.toggle('checked',this.checked)"> ${label}</label>`;
}
function getCheckedPills(group){
  return Array.from(document.querySelectorAll(`input[data-group="${group}"]:checked`)).map(i=>i.value);
}

/* ==================================================
   STORAGE UPLOAD HELPER — real Firebase Storage, no fake/local URLs
   ================================================== */
async function uploadImageFile(fileInputId, targetUrlInputId){
  const input = document.getElementById(fileInputId);
  const file = input && input.files[0];
  if(!file) return;
  if(connectionState!=='live'){ Toast.show('Unable to connect to CollabFlow. Please check your connection and try again.','error'); return; }
  Toast.show('Uploading…','info');
  try{
    const path = `uploads/${Date.now()}_${file.name}`;
    const storageRef = Backend.storageMod.ref(Backend.storage, path);
    await Backend.storageMod.uploadBytes(storageRef, file);
    const url = await Backend.storageMod.getDownloadURL(storageRef);
    document.getElementById(targetUrlInputId).value = url;
    Toast.show('Image uploaded. Click Save to publish it.');
  }catch(e){ console.error(e); Toast.show('Upload failed. Please try again.','error'); }
}

/* ==================================================
   AUTH — real Firebase Authentication. No hardcoded credentials anywhere.
   Login/signup functions are shared; each page's own script decides what
   to render once session.admin/brand/creator is set (via window.onAuthResolved).
   ================================================== */
let brandAuthMode = 'login';
let creatorAuthMode = 'login';

const Auth = {
  async loginAdmin(){
    if(connectionState!=='live'){ showErr('adminLoginError','Unable to connect to CollabFlow. Please check your connection and try again.'); return; }
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value;
    if(!email || !pass){ showErr('adminLoginError','Enter your email and password.'); return; }
    hideErr('adminLoginError');
    try{ await Backend.authMod.signInWithEmailAndPassword(Backend.auth, email, pass); Toast.show('Signed in.'); }
    catch(e){ showErr('adminLoginError', mapAuthError(e)); }
  },
  toggleBrandMode(){
    brandAuthMode = brandAuthMode==='login' ? 'signup':'login';
    document.getElementById('brandsAuthTitle').textContent = brandAuthMode==='login' ? 'Sign in' : 'Create brand account';
    document.getElementById('brandsNameField').style.display = brandAuthMode==='signup' ? 'block':'none';
    document.getElementById('brandsAuthBtn').textContent = brandAuthMode==='login' ? 'Log in' : 'Sign up';
    document.getElementById('brandsToggleBtn').textContent = brandAuthMode==='login' ? "New brand? Sign up" : "Already have an account? Log in";
  },
  async brandSubmit(){
    if(connectionState!=='live'){ showErr('brandsLoginError','Unable to connect to CollabFlow. Please check your connection and try again.'); return; }
    const email = document.getElementById('brandsEmail').value.trim();
    const pass = document.getElementById('brandsPassword').value;
    if(!email || !pass){ showErr('brandsLoginError','Enter your email and password.'); return; }
    hideErr('brandsLoginError');
    const {doc, setDoc, serverTimestamp} = Backend.fsMod;
    try{
      if(brandAuthMode==='signup'){
        const name = document.getElementById('brandsSignupName').value.trim();
        if(!name){ showErr('brandsLoginError','Enter your brand name.'); return; }
        const cred = await Backend.authMod.createUserWithEmailAndPassword(Backend.auth, email, pass);
        const uid = cred.user.uid;
        await setDoc(doc(Backend.db,'users',uid), {email, role:'BRAND', status:'PENDING', createdAt:serverTimestamp()});
        await setDoc(doc(Backend.db,'brands',uid), {name, ownerUid:uid, email, phone:'', website:'', socialLinks:[], category:'', location:'', logo:'', cover:'', description:'', status:'PENDING', publicStatus:false, createdAt:serverTimestamp(), updatedAt:serverTimestamp()});
        Toast.show('Brand account created — pending CollabFlow review.');
      } else {
        await Backend.authMod.signInWithEmailAndPassword(Backend.auth, email, pass);
        Toast.show('Signed in.');
      }
    }catch(e){ showErr('brandsLoginError', mapAuthError(e)); }
  },
  toggleCreatorMode(){
    creatorAuthMode = creatorAuthMode==='login' ? 'signup':'login';
    document.getElementById('creatorAuthTitle').textContent = creatorAuthMode==='login' ? 'Sign in' : 'Create creator account';
    document.getElementById('creatorNameField').style.display = creatorAuthMode==='signup' ? 'block':'none';
    document.getElementById('creatorUsernameField').style.display = creatorAuthMode==='signup' ? 'block':'none';
    document.getElementById('creatorAuthBtn').textContent = creatorAuthMode==='login' ? 'Log in' : 'Sign up';
    document.getElementById('creatorToggleBtn').textContent = creatorAuthMode==='login' ? "New creator? Sign up" : "Already have an account? Log in";
  },
  async creatorSubmit(){
    if(connectionState!=='live'){ showErr('creatorLoginError','Unable to connect to CollabFlow. Please check your connection and try again.'); return; }
    const email = document.getElementById('creatorEmail').value.trim();
    const pass = document.getElementById('creatorPassword').value;
    if(!email || !pass){ showErr('creatorLoginError','Enter your email and password.'); return; }
    hideErr('creatorLoginError');
    const {doc, setDoc, serverTimestamp} = Backend.fsMod;
    try{
      if(creatorAuthMode==='signup'){
        const name = document.getElementById('creatorSignupName').value.trim();
        const username = document.getElementById('creatorSignupUsername').value.trim();
        if(!name || !username){ showErr('creatorLoginError','Enter your name and username.'); return; }
        const cred = await Backend.authMod.createUserWithEmailAndPassword(Backend.auth, email, pass);
        const uid = cred.user.uid;
        await setDoc(doc(Backend.db,'users',uid), {email, role:'CREATOR', status:'PENDING', createdAt:serverTimestamp()});
        await setDoc(doc(Backend.db,'creators',uid), {name, username, ownerUid:uid, privateEmail:email, privatePhone:'', profileImage:'', coverImage:'', bio:'', categories:[], platforms:[], followers:0, following:0, averageViews:0, engagementRate:0, location:'', socialLinks:[], rates:{reel:0,story:0,post:0,video:0,ugc:0}, negotiable:true, packages:[], preferences:{}, status:'PENDING', publicStatus:false, createdAt:serverTimestamp(), updatedAt:serverTimestamp()});
        Toast.show('Creator account created — pending CollabFlow review.');
      } else {
        await Backend.authMod.signInWithEmailAndPassword(Backend.auth, email, pass);
        Toast.show('Signed in.');
      }
    }catch(e){ showErr('creatorLoginError', mapAuthError(e)); }
  },
  async logout(){
    try{ await Backend.authMod.signOut(Backend.auth); Toast.show('Logged out.'); }
    catch(e){ console.error(e); }
  }
};

/* ==================================================
   NOTIFICATIONS
   ================================================== */
const Notifications = {
  open(role){
    const list = notifications[role] || [];
    UI.openModal(`
      <h3>Notifications</h3>
      <div style="display:flex; justify-content:flex-end; margin-bottom:10px;"><button class="btn btn-ghost btn-sm" onclick="Notifications.markAll('${role}')">Mark all as read</button></div>
      <div class="notif-list">${list.length? list.map(n=>`<div class="notif-item ${n.read?'read':''}"><div class="t">${UI.escapeHtml(n.title)}</div><div class="m">${UI.escapeHtml(n.message)}</div></div>`).join('') : '<p style="color:var(--ink-soft); font-size:14px;">No notifications yet.</p>'}</div>
    `);
  },
  async markAll(role){
    const list = notifications[role]||[];
    const {doc, updateDoc} = Backend.fsMod;
    try{
      await Promise.all(list.filter(n=>!n.read).map(n=>updateDoc(doc(Backend.db,'notifications',n.id),{read:true})));
      UI.closeModal();
    }catch(e){ console.error(e); Toast.show("You don't have permission to perform this action.",'error'); }
  }
};

/* auto-start */
bootstrap();
