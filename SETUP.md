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


### Alpha 1.9.6
Replace all five app files and reload once. Confirm the player shows ALPHA 1.9.6. Test clicking "Browse folders" from inside the expanded full-screen player, verify edge-to-edge cover art with bottom gradient text overlay, and test the new Level and Crossfade toggles.


### Alpha 1.9.7
Upload all app files including the three PNG logo assets (`logo-192.png`, `logo-512.png`, `apple-touch-icon.png`) and reload once. Confirm the player shows ALPHA 1.9.7, your vinyl/ribbon emblem appears in the header and default player art, and the dark 70s funk color palette and Fraunces/Plus Jakarta Sans typography load cleanly.


### Alpha 1.9.8
Upload all app files including the updated PNG logo assets (`logo-192.png`, `logo-512.png`, `apple-touch-icon.png`) and `vinyl-overlay.jpg`, then reload once. Confirm the player shows ALPHA 1.9.8, headlines use Space Grotesk sans-serif, cover art scales cleanly inside the viewport on mobile/desktop without clipping, and the distressed vinyl sleeve texture blends over the artwork.


### Alpha 1.9.9
Upload ALL files in this package (including the PNG logos and vinyl-overlay.jpg), replacing everything in the repo, then hard reload. Confirm the player shows ALPHA 1.9.9.


### Alpha 1.9.10
Replace all files, close and reopen the app, confirm ALPHA 1.9.10. Test: play a song, lock the phone, and confirm it keeps playing into the next song.


### Alpha 1.9.11
Replace all files, close and reopen the app, confirm ALPHA 1.9.11. Crossfade is gone; Level remains.


### Alpha 1.9.12
Replace all files, close and reopen the app, confirm ALPHA 1.9.12.


### Alpha 1.9.13
Replace all files — there are 7 new image files (buttons, knob, VU meter), 18 files total. Close and reopen the app, confirm ALPHA 1.9.13.
