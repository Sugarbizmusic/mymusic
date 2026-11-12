# MyMusic — Alpha 1.0

Mobile-first, read-only Google Drive MP3 player. Scans MP3s recursively beneath the configured MyMusic folder, plays selected tracks, looks for sibling cover images, and publishes browser Media Session metadata/lock-screen actions where supported.

## Privacy
- Keep the Drive folder **Restricted**.
- App requests only `https://www.googleapis.com/auth/drive.readonly`.
- Never add a Google client secret to this project. The browser OAuth client ID is public by design.

## Google setup
1. Go to https://console.cloud.google.com/ and create/select a project.
2. Enable **Google Drive API**.
3. Configure the OAuth consent screen. For personal testing, External + add your Google account as a Test User is fine.
4. APIs & Services → Credentials → Create Credentials → OAuth client ID → **Web application**.
5. Add an Authorized JavaScript origin:
   - `http://localhost:8000` for local testing, or
   - `https://YOUR_GITHUB_USERNAME.github.io` for GitHub Pages.
   Use the origin only, not the repository path.
6. Copy the Client ID and replace `PASTE_GOOGLE_OAUTH_WEB_CLIENT_ID_HERE` in `app.js`.

## Run locally
From this directory run `python3 -m http.server 8000`, then visit http://localhost:8000.

## Publish
Upload these files to a GitHub repository and enable Pages from `main` / root. Add the GitHub Pages origin to the OAuth client's Authorized JavaScript origins, then sign in.

## Folder conventions
The scanner walks every subfolder below MyMusic and finds `.mp3` files. The first folder below MyMusic is shown as artist/project; the immediate parent folder is shown as release. It looks for Artwork.jpg, cover.jpg, folder.jpg, or any JPG/PNG/WEBP image in the same folder as the tracks.

## Known Alpha 1.0 limitations
- Selected MP3 files are downloaded fully into a browser Blob before playback. This is simple for the first test, but large files can use significant phone memory; a later version should use a more scalable authenticated streaming approach if needed.
- It does not yet parse embedded ID3 tags or embedded artwork.
- It lists MP3 files only.
- iPhone background playback, lock-screen metadata, and Tesla Bluetooth artwork/metadata vary by iOS/browser/vehicle version and must be tested on the actual devices.
- Service worker caches only the app shell, not music or OAuth tokens.
