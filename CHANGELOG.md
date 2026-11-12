# MyMusic Alpha 1.1

## Changes
- Expanded discovery from MP3-only to MP3, WAV, M4A, AAC, FLAC and MP4 containers.
- MP4 files are handled through the HTML audio element; no video UI is included.
- Added format filter chips and per-format counts.
- Added folder-shortcut traversal for Drive shortcuts that point to folders.
- Preserved the existing Google Drive root folder ID and OAuth client ID.
- Preserved read-only Drive scope and Media Session lock-screen controls.

## Compatibility note
The browser's audio decoder determines whether a specific file can play. WAV, MP3 and common AAC/M4A/MP4 audio are widely supported, but FLAC and MP4 codec support varies by browser and operating system. Unsupported files remain listed and show a playback error when selected.

## Deployment
Replace the existing repository files with this package's files and commit to `main`. Keep `app.js`'s configured Client ID and root folder ID intact.
