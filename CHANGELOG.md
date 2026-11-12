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
