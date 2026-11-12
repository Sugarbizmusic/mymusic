# MyMusic Alpha 1.1 deployment

1. Unzip this package.
2. In the existing `sugarbizmusic/mymusic` GitHub repository, replace the existing six files with the files in this folder. Upload the updated `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, and `CHANGELOG.md` (and optionally this guide).
3. Commit directly to `main`. GitHub Pages will redeploy automatically.
4. Open the site and use Refresh library. If the old interface remains cached, hard-refresh the browser or close/reopen the home-screen web app.

Google settings are unchanged. Keep the Drive folder Restricted. The application uses the existing OAuth Client ID and requests only `drive.readonly`.

## Supported file extensions
MP3, WAV, M4A, AAC, FLAC and MP4. MP4 is presented as audio only. Actual playback depends on browser/OS codec support.
