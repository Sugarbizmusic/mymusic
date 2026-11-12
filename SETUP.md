# MyMusic Alpha 1.9

Replace the existing app files in the GitHub repository with the files in this folder:
`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and `sw.js`.

Keep the repository's GitHub Pages configuration unchanged. The configured Google OAuth Client ID and private MyMusic Drive root folder ID are retained in `app.js`.

The app requires the Google account used for OAuth to have access to the restricted MyMusic Drive folder. If Google authorization expires or is revoked, use Reconnect Drive.


### Alpha 1.9.2 cache refresh
After replacing the five app files, reload the page once. The updated service worker uses a new cache namespace and refreshes app assets from the network.
