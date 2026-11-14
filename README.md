# CollabFlow starter

A static, mobile-responsive landing page using HTML, CSS, vanilla JavaScript ES modules, Firebase Authentication and Cloud Firestore.

## Files
- `index.html` — landing page
- `css/style.css` — responsive styling
- `js/firebase.js` — Firebase app, Auth and Firestore initialization
- `js/app.js` — Firebase connection smoke test

## Deploy with GitHub Pages
1. Upload the contents of this folder to the root of your existing GitHub repository (so `index.html` is at repository root).
2. Commit the files to your deployment branch.
3. In GitHub, open Settings → Pages.
4. Choose Deploy from a branch, select `main` and `/ (root)`, then Save.
5. Add the exact published GitHub Pages hostname in Firebase Console → Authentication → Settings → Authorized domains.

## Verify
Open the published site and browser developer tools → Console. You should see:
- `CollabFlow frontend loaded.`
- `Connected Firebase project: collabflow-5f472`

This is the first landing-page milestone only. Login/signup routes and live Firestore features will be added in the next milestone. The displayed dashboard is illustrative, not live data.

## Security
Firebase web configuration is intended for client-side use. Never put service-account keys, private credentials, or admin passwords in this repository. Keep Firestore Security Rules restrictive and test them before enabling new collections.
