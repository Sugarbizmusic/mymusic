## Alpha 1.9.16
- Pop-out player: a new button next to Expand (home and expanded screens) opens the player in its own always-on-top window (400×840, the phone layout). Desktop Chrome, Edge and Firefox only; the button is hidden in Safari and on phones/iPads.
- Music keeps playing in the original tab; every control in the pop-out works (buttons, knob, Level, seek, VU, Last played / Up next).
- While popped out, the page shows "Playing in the pop-out window" with a "Bring player back" button. Closing the pop-out (or Chrome's back-to-tab button) also brings the player back.
- Inside the pop-out the Expand, Pop-out and Browse buttons are hidden.
- Bumped service-worker cache to mymusic-shell-v1-9-16.

## Alpha 1.9.15
- iPhone: the volume knob sits at full, which is what the app actually outputs (iOS always plays web audio at 100% and the side buttons scale it; web apps can't read or change that level).
- iPhone: dragging the knob (6pt or more of movement), scrolling on it or using arrow keys shows a short note: "Use the side buttons for volume". A plain tap shows nothing.
- Other devices: the knob works as before and remembers its setting.
- Wide screens (820pt and up: desktop, iPad landscape): the home player runs the knob, transport buttons, Level and VU meter in one row under the seek bar. Phones keep the stacked layout.
- Bumped service-worker cache to mymusic-shell-v1-9-15.

## Alpha 1.9.14
- New volume knob artwork (tick ring). The knob image stays still and a drawn indicator line turns with the volume (-132° to +132°).
- Expanded player: the full cover art is shown uncropped as a square, and its bottom fades into the background under the track name (vinyl overlay kept).
- Expanded player: the track name stays on one line and shrinks to fit (down to 15pt, then "…" for extremely long names).
- Level now applies to the song that's playing straight away (it re-processes the current song and carries on from the same spot) and shows the adjustment, e.g. "Level on · +4.6 dB on this song".
- Button icons: softer edge pulled back and drawn with an SVG filter; the "15" labels are now drawn shapes instead of text. Fixes the magenta corner marks some iPhones drew on the skip buttons.
- Removed knob-back.png and knob-cap.png; added knob.png.
- Bumped service-worker cache to mymusic-shell-v1-9-14.

## Alpha 1.9.13
- Vintage deck styling: the five transport buttons are hardware push buttons, all the same size across the full width.
  - Prev / Back 15 / Forward 15 / Next: press in and light while held, stay lit for a moment after release, then go dark.
  - Play/Pause: lit while a song is playing (showing the pause icon), dark when paused; presses in when tapped.
- Level is now a small latching push button: pressed in and lit when on, out and dark when off.
- Rotary volume knob (drag around it, drag up/down near the center, scroll wheel, or arrow keys). Only the cap turns; the ring stays fixed. Volume is remembered. On iPhone the knob turns but iOS only allows the side buttons to change volume.
- VU meter with an animated needle. When Level is on it follows the song's real loudness; otherwise it's a simulated movement while playing, and rests left when paused.
- Expanded player: cover art is anchored to the top, so any crop (the art area is a little shorter than wide) happens only at the bottom, under the fade.
- Expanded player: lighter fade under the art so its bottom edge stays visible.
- Level button centered between the knob and the VU meter.
- Expanded player without cover art: the MyMusic emblem now fills the whole art area on the purple background.
- Browse folders: back arrow at the left of the breadcrumbs.
- Button icons are printed on the caps in a faded dark purple with a soft edge, centered on the cap face.
- Deck row: larger volume knob sized so its visible ring matches the VU meter's visible height (top and bottom aligned); VOL sits the same distance below the knob as the version number below the meter, on the same baseline; knob, Level button and VU meter share one center line; version number centered under the VU meter.
- New files: btn-off.webp, btn-on.webp, btn-press-off.webp, btn-press-on.webp, knob-back.png, knob-cap.png, vu-meter.png (also cached for offline use).
- Bumped service-worker cache to mymusic-shell-v1-9-13.

## Alpha 1.9.12
- Home screen no longer shows a track list. Browse folders, All songs and Recent songs each open the same song picker window, in folder, A–Z by folder, or most-recent-first order.
- Search moved into the picker window (All songs and Recent songs).
- The home player is larger and fills the rest of the screen: bigger cover art (up to 132px), two-line title, larger transport buttons (66px play).
- The picker window is now a centered floating window everywhere (it used to hang from the top on the home screen).
- Circle buttons: the close × is now an icon instead of a text character (it sat about 4pt low), the "15" in the skip buttons is centered, and every circle icon is pinned to the exact center.
- Bumped service-worker cache to mymusic-shell-v1-9-12.

## Alpha 1.9.11
- Removed Crossfade completely (button, code and saved setting). All playback goes through the plain audio player, which keeps playing with the screen off.
- The next song now downloads in the background during the last 25 seconds of the current one, so track changes are faster, including with the screen off.
- Bumped service-worker cache to mymusic-shell-v1-9-11.

## Alpha 1.9.10
- Fixed: music stopped when the iPhone screen turned off. Since 1.9.6, every song was routed through Web Audio (for Level/Crossfade), which iOS pauses on lock. Playback now uses the plain audio player again.
- Level now pre-processes each song in the background (measure loudness, adjust, limit) and plays the result through the normal player, so it works with the screen off. Turning Level on or off applies from the next song.
- Crossfade still needs Web Audio, so on iPhone it only works while the screen is on. With the screen off, songs change normally without a fade. Turning Crossfade off restores normal screen-off playback right away.
- Asks Safari for a "playback" audio session where supported.
- Bumped service-worker cache to mymusic-shell-v1-9-10.

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
