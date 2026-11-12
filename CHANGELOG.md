## Alpha 1.9.9
- Headlines (Your library, the welcome headline, folder browser title, expanded track title) now use Space Grotesk Light (300).
- Home player: new Last played / Up next strip. Last played is dimmed; tap it to go back, tap Up next to skip forward.
- Added a Recent songs button next to All songs. It lists your last 30 played songs, newest first, and is saved between visits.
- Expanded player: cover art now runs edge to edge under the top bar, with a soft fade into the title. Square art fills the full width; on short screens it crops slightly instead of shrinking.
- Replaced all text-character icons with SVG icons, so the expand/collapse icon is centered everywhere.
- Play button is now a true circle in both views (it was being squeezed into an egg shape on narrow screens).
- New Back 15 / Forward 15 icons (circular arrow with "15") replace the old curly arrows.
- Fixed: in All songs and Recent songs, Next now follows the list order instead of jumping between albums by file name.
- Browse folders / All songs / Recent songs stay on one row on phones (folder emoji hidden under 400px wide).
- Bumped service-worker cache to mymusic-shell-v1-9-9.

## Alpha 1.9.8
- Replaced the serif `Fraunces` display typeface with **Space Grotesk** paired with **Plus Jakarta Sans** for an all-sans-serif typographic hierarchy.
- Fixed full-screen cover art scaling on phones and desktop modals so artwork fits cleanly inside its square `.art-frame` container (`object-fit: contain`) without cropping past the screen edges.
- Added the distressed vinyl sleeve overlay (`vinyl-overlay.jpg` from `album.jpg`) layered directly over cover art using `mix-blend-mode: plus-lighter` (matching Photoshop's **Linear Dodge (Add)** blend mode).
- Replaced all app icons (`logo-192.png`, `logo-512.png`, `apple-touch-icon.png`) with the updated `MyMusic_Icon.png` artwork and bumped the service-worker cache namespace to `mymusic-shell-v1-9-8`.

## Alpha 1.9.7
- Applied a refined **Modern 70s Funk** dark-mode visual system sampled directly from your vinyl/ribbon emblem (`#140915` deep plum-espresso background, `#F3E0B5` warm cream typography & borders, `#8D3778` royal plum, `#DD694F` terracotta coral, `#EEA031` marigold gold, and `#C87422` burnt amber).
- Replaced the header icon and default album artwork placeholder with your custom logo (`logo-192.png`, `logo-512.png`, and `apple-touch-icon.png`) and registered them in `manifest.webmanifest`.
- Updated display typography to **Fraunces** paired with **Plus Jakarta Sans**, added tactile cream-rimmed pill buttons with subtle offset shadows, vinyl disc track thumbnails, and 4-color funk ribbon accents.
- Bumped service-worker cache namespace to `mymusic-shell-v1-9-7`.

## Alpha 1.9.6
- Fixed the "Browse folders" button inside the expanded full-screen player by moving `#folderModal` out of `<main>` (which was hidden during full-screen playback).
- Redesigned the expanded full-screen Now Playing layout so cover art bleeds edge-to-edge directly beneath the top bar, with a smooth bottom black gradient fading into overlaid track title and artist/release metadata.
- Added a **Level: On/Off** toggle using the Web Audio API to analyze track RMS loudness and normalize playback gain across demos with a protective dynamics limiter.
- Added a **Crossfade: On/Off** toggle with dual-deck equal-power 4-second crossfading and automatic pre-fetching of the next track.
- Bumped service-worker cache namespace to `mymusic-shell-v1-9-6`.

## Alpha 1.9.5
- Added an expand/collapse toggle (`⤢` / `⤡`) on the player to switch into a full-screen now-playing view with large cover art and prominent transport controls.
- Added a "Browse folders" button inside the expanded full-screen player that opens the Drive folder browser modal directly over the full-screen view.
- Added a "Drive session expired · Tap to continue playback" prompt on the player when autoplay stops after the 1-hour Google token expires, allowing one-tap resume via the prompt or Play button.
- Bumped service-worker cache namespace to `mymusic-shell-v1-9-5`.

## Alpha 1.9.4
- Drive sign-in now survives page reloads until Google's token expires (about 1 hour).
- Reconnect uses Google's quick sign-in instead of forcing the full consent screen every time.
- Library scan is cached, so reconnecting no longer rescans Drive (use Refresh to rescan).
- When sign-in expires, the library stays visible; tapping any track reconnects and plays in one step.
- Removed the automatic sign-in popup on page load (browsers block it).

## Alpha 1.9.3
- Rewired Browse folders and All songs using delegated click handling.
- Exposed a small MyMusicApp diagnostic interface for verifying navigation state.
- Made the optional folder summary element null-safe.
- Bumped service-worker cache namespace.

## Alpha 1.9.2
- Fixed stale Alpha 1.8 service-worker cache namespace.
- Service worker now activates immediately, claims open tabs, and prefers fresh app assets.
- App explicitly requests a service-worker update on load.

# MyMusic Alpha 1.9

- Rebuilt folder navigation around the actual Google Drive folder hierarchy, including empty folders and breadcrumb navigation.
- Folder browser shows audio tracks inside the selected folder; selecting a track starts a folder-scoped playback queue.
- Previous/Next and automatic end-of-track playback cycle within the selected folder and wrap to the first track.
- Improved expired/revoked Drive authorization handling with a clear reconnect state.
- Removed audio-format filter controls.
- Simplified Browse folders button markup and styling to prevent text collisions.
- Cover art now replaces the large music-note placeholder in the player; uses the sole image in the track's folder regardless of filename.
- Preserved the configured OAuth Client ID and private MyMusic Drive folder ID.


## Alpha 1.9.1 — artwork visibility fix
- Fixed the browser default `[hidden]` behavior being overridden by artwork display styles.
- The player now shows exactly one artwork tile: the music-note placeholder until cover art loads, then the cover image in the same position.
- No separate artwork image or alt text should appear beside the placeholder.
