# CollabFlow V2 — Firebase live platform starter

This replaces the initial static landing page with a working Firebase-backed starter:
- Email/password and Google sign-in
- Creator / brand account type
- User dashboard and profile submission
- Admin review queue, approve / reject, manual publishing and unpublishing
- Public profile directory updates live using Firestore `onSnapshot`
- No Firebase Storage dependency: profile image fields accept externally hosted HTTPS image URLs

## 1. Upload
Upload the CONTENTS of this folder to the root of the existing GitHub repository, replacing the old `index.html`, `css/style.css`, and `js` files. Keep the folder structure exactly as below:

```
index.html
login.html
signup.html
dashboard.html
admin.html
css/style.css
js/firebase.js
js/common.js
js/auth.js
js/public.js
js/dashboard.js
js/admin.js
firestore.rules
README.md
```

## 2. Firebase Authentication
In Firebase Console → Authentication → Sign-in method:
- Enable Email/Password
- Enable Google (configure the support email)
In Authentication → Settings → Authorized domains, add the exact GitHub Pages hostname and your custom domain if used. Do not include `https://` or a path.

## 3. Publish Firestore rules
Open Firestore Database → Rules. Replace the rules with the contents of `firestore.rules`, then Publish.

These rules intentionally deny client writes to `admins`. Do not weaken that rule.

## 4. Set up the first admin securely
1. Sign up through the website using the administrator email account. Do not put the admin password in any source file, GitHub commit, or chat code.
2. In Firebase Authentication → Users, open that account and copy its UID.
3. In Firestore → Data, create collection `admins`, document ID = that exact UID.
4. Add field `active` (boolean) = `true`.
5. Save. The admin account can now open `/admin.html`.

Admin access is based on the protected `admins/{uid}` document, NOT on an email address or a client-side email check. Never create an `admins` document for ordinary users. Only a trusted project owner should do this manually in the Firebase Console or with a trusted server/Admin SDK.

## 5. How profiles work
- Visitors see only `publicProfiles` documents whose `status` is `published`.
- Creator/brand users submit their profile from `/dashboard.html`. Submissions go to `submissions` with `status: pending`.
- Admin reviews submissions at `/admin.html`.
- Approve creates a public profile and marks the submission approved.
- Admin can also publish a profile manually if details are received outside the website.
- Firestore `onSnapshot` keeps the public directory and admin queue updated live.

## 6. Deploy
Commit and push to the GitHub Pages branch. Wait for deployment. Visit:
- `/` public home
- `/signup.html`
- `/login.html`
- `/dashboard.html` (requires login)
- `/admin.html` (requires admin document)

## 7. Important production notes
- Firebase web config is public client configuration; Firestore Rules provide data access control. Never commit service-account JSON, private keys, payment secrets, or admin passwords.
- This starter does not use Firebase Storage. Profile image URLs must be HTTPS links hosted elsewhere.
- Configure Firebase App Check before public production launch to reduce abuse.
- Add Firebase budget alerts / usage monitoring.
- The current approval flow creates a new public profile on approval. For a later update/re-approval workflow, add a `publicProfileId` reference and update the existing public profile rather than creating a duplicate.
- Firestore may prompt for a composite index for queries combining `where` and `orderBy`; follow the console's generated index link if prompted.
- Email verification is sent on signup, but this starter does not yet block unverified accounts. Add an explicit verified-email requirement before production if that is part of the launch policy.
