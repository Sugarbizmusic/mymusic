# MyMusic Alpha 1.9

Replace the existing app files in the GitHub repository with the files in this folder:
`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and `sw.js`.

Keep the repository's GitHub Pages configuration unchanged. The configured Google OAuth Client ID and private MyMusic Drive root folder ID are retained in `app.js`.

The app requires the Google account used for OAuth to have access to the restricted MyMusic Drive folder. If Google authorization expires or is revoked, use Reconnect Drive.


### Alpha 1.9.2 cache refresh
After replacing the five app files, reload the page once. The updated service worker uses a new cache namespace and refreshes app assets from the network.


### Alpha 1.9.3
Replace all five app files. Confirm the player shows ALPHA 1.9.3 after reload. In Chrome Console, `MyMusicApp.getNavigationState()` reports navigation controls and library state.


### Alpha 1.9.4
Replace all five app files and reload once. Confirm the player shows ALPHA 1.9.4. Connect once; after that, reloads within the hour need no sign-in, and later visits need one tap.


### Alpha 1.9.5
Replace all five app files and reload once. Confirm the player shows ALPHA 1.9.5. Test expanding the player to full screen (`⤢`), browsing Drive folders from the expanded view, and resuming playback with one tap if a token expires during autoplay.
