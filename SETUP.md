# MyMusic Player Alpha 1.3

Replace the app files in the root of `sugarbizmusic/mymusic` with the files in this package:
- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`

Optionally upload `CHANGELOG.md` for reference.

Your configured Google OAuth Client ID and MyMusic Drive root folder ID are retained in `app.js`. Do not replace them with placeholders.

After committing to `main`, wait for GitHub Pages to redeploy, then hard-refresh the site. On iPhone, fully close and reopen the web app if it still displays the prior version.

Alpha 1.3 includes folder navigation, the player version label, and automatic silent Google Drive reauthorization where Google's session permits it. It does not store your Google password or access token.
