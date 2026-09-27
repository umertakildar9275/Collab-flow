# CollabFlow

Static, multi-page site (no build step) connected to Firebase.

## Files
- `index.html` — public site (home, Brand Hub, Creator Hub, About, Footer, login/signup)
- `admin.html` — Admin Panel
- `brands.html` — Brands Panel
- `creator.html` — Creator Panel
- `css/styles.css` — shared design system
- `js/firebase-init.js` — Firebase config + init (Demo Mode fallback if init fails)
- `js/shared.js` — auth, Firestore/Storage helpers, toasts, modals, demo data

## Firebase Console setup (one-time)
1. **Authentication** → Sign-in method → enable **Email/Password**.
2. **Firestore Database** → Create database (production mode).
3. **Storage** → Get started (default bucket is already in the config).
4. Paste the rules below into **Firestore → Rules** and **Storage → Rules**, then Publish.
5. **Authentication → Settings → Authorized domains** — add your GitHub Pages domain, e.g. `umertakildar9275.github.io`.

## Create the first ADMIN user
Public sign-up only ever creates `BRAND` or `CREATOR` accounts — by design, there's no admin sign-up form.
1. Firebase Console → Authentication → Users → **Add user** → enter the admin email + password.
2. Firebase Console → Firestore → `users` collection → create a document with **Document ID = that user's UID** (copy it from the Authentication tab) with fields:
   ```
   uid: "<paste UID>"
   email: "<admin email>"
   role: "ADMIN"
   status: "APPROVED"
   ```
3. Log in at `admin.html` with that email/password.

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return isSignedIn() && role() == 'ADMIN'; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isAdmin();
    }
    match /website/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /rules/{doc}   { allow read: if true; allow write: if isAdmin(); }

    match /brands/{brandId} {
      allow read: if resource.data.publicStatus == true || isOwner(brandId) || isAdmin();
      allow write: if isOwner(brandId) || isAdmin();
    }
    match /creators/{creatorId} {
      allow read: if resource.data.publicStatus == true || isOwner(creatorId) || isAdmin();
      allow write: if isOwner(creatorId) || isAdmin();
    }
    match /campaigns/{campaignId} {
      allow read: if resource.data.publicStatus == true
                   || (isSignedIn() && resource.data.brandId == request.auth.uid) || isAdmin();
      allow create: if isSignedIn() && request.resource.data.brandId == request.auth.uid;
      allow update, delete: if (isSignedIn() && resource.data.brandId == request.auth.uid) || isAdmin();
    }
    match /applications/{appId} {
      allow create: if isSignedIn() && request.resource.data.creatorId == request.auth.uid;
      allow read, update: if isAdmin()
                            || (isSignedIn() && resource.data.creatorId == request.auth.uid)
                            || (isSignedIn() && resource.data.brandId == request.auth.uid);
    }
    match /collaborationRequests/{reqId} {
      allow create: if isSignedIn() && request.resource.data.brandId == request.auth.uid;
      allow read, update: if isAdmin()
                            || (isSignedIn() && resource.data.brandId == request.auth.uid)
                            || (isSignedIn() && resource.data.creatorId == request.auth.uid);
    }
  }
}
```

## Storage Security Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                    && request.resource.size < 8 * 1024 * 1024
                    && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## What's simplified in this build (be aware)
- Notifications, audit-log writing, and bulk actions are not wired up yet — the data model supports them (`notifications`, `auditLogs` collections) but no UI writes to them yet.
- Image "upload" fields also accept a plain URL — use whichever is easier; both save to the same field.
- Real-time `onSnapshot` listeners aren't used yet; panels re-fetch on tab switch. Fine at this scale, worth adding later for instant multi-tab updates.
