# MyMusic Player Alpha 1.4

Replace these files in the root of `sugarbizmusic/mymusic`:
- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`

Optionally upload `CHANGELOG.md`.

The configured Google OAuth Client ID and MyMusic Drive root folder ID are preserved in `app.js`. Do not replace them.

Commit to `main`, wait for GitHub Pages to redeploy, then hard-refresh the site. The folder browser is now a collapsed-by-default accordion labeled “Browse folders”. Tap it to expand.

Alpha 1.4 retains the automatic silent Google Drive authorization attempt. If Google cannot silently authorize, the app will still request a manual connection.
