# CollabFlow — single-file build

Everything (public site + Admin Panel + Brands Panel + Creator Panel) lives in **one file: `index.html`**.
CSS is inline in `<style>`, all JS is inline in `<script>` blocks. No other files are required.

Panels are reached by URL hash, not separate pages:
- Public site: `index.html`
- Admin Panel: `index.html#admin`
- Brands Panel: `index.html#brands`
- Creator Panel: `index.html#creator`

## Firebase Console setup (one-time)
1. **Authentication** → Sign-in method → enable **Email/Password**.
2. **Firestore Database** → Create database (production mode).
3. **Storage** → Get started (default bucket is already in the config).
4. Paste the rules below into **Firestore → Rules** and **Storage → Rules**, then Publish.
5. **Authentication → Settings → Authorized domains** — add your GitHub Pages domain, e.g. `umertakildar9275.github.io`.

## Create the first ADMIN user
Public sign-up only ever creates `BRAND` or `CREATOR` accounts — there's no admin sign-up form by design.
1. Firebase Console → Authentication → Users → **Add user** → enter the admin email + password.
2. Firebase Console → Firestore → `users` collection → create a document with **Document ID = that user's UID** (copy it from the Authentication tab):
   ```
   uid: "<paste UID>"
   email: "<admin email>"
   role: "ADMIN"
   status: "APPROVED"
   ```
3. Go to `index.html#admin` and log in with that email/password.

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

## What's simplified in this build
- Notifications and audit-log UI aren't wired up yet (the Firestore model supports them later).
- Image fields accept either a direct upload or a pasted URL — both save to the same field.
- Panels re-fetch data each time you switch tabs rather than using live `onSnapshot` listeners — fine at this scale, worth adding later for instant updates.
