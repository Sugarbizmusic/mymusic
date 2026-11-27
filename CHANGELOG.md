## Alpha 1.9.43
- Found the real cause of the "Failed to fetch" errors, from the event log you sent over: downloads were dying mid-stream (a second or two into a multi-MB transfer, logged as "dropped while downloading"), not failing to connect in the first place — a dropped wifi/connection partway through, not at the start. 1.9.41's retry only covered a failed connect, so it never caught this. Now the whole download — connecting and reading — is retried as one unit, up to 3 attempts total, which is what actually recovers from a mid-transfer drop.
- Also fixed: a prefetch that gets cancelled because you've already moved to a different song was incorrectly logging as a failure ("dropped while downloading") instead of a normal cancellation — harmless, but it was cluttering the event log and made it harder to tell a real failure from an expected one.

## Alpha 1.9.42
- Moved Shuffle off the Browse folders screen entirely. It's now a lit icon button on the Now Playing panel, to the left of the copy-link icon — it lights up gold when shuffle is on for whatever's currently playing, and works whether or not Browse folders is even open.

## Alpha 1.9.41
- Fixed: right after 1.9.40 shipped, every song failed to load with a "Failed to fetch" alert. Root cause was a weak/dropped network connection at the moment of download (the same kind of momentary signal loss or cell-tower handoff a phone or car modem can hit while moving) — nothing in the 1.9.38/1.9.39/1.9.40 code touched the download path itself. A track download that fails at the network level now retries once automatically before giving up, which clears most one-off blips silently. If every track is still failing after the retry (a real, sustained outage), the alert now says plainly that it looks like a connection problem rather than showing the old generic "couldn't be loaded" message — so it's obvious at a glance whether it's the app or the signal.

## Alpha 1.9.40
- Added a Shuffle button in Browse folders, next to Edit order. It shuffles the playback order of whatever folder you're currently in — the on-screen list still shows the regular A-Z/custom order, only the next/previous walk-through is shuffled, same as "shuffle this album" in other music apps. If something from that folder is already playing, shuffling keeps it playing (no restart) and just reshuffles what comes after; turning it back off restores the normal order the same way.
- Shuffle doesn't touch the folder's saved custom order (the one Edit order manages) — it's purely a playback-order setting for the current session.

## Alpha 1.9.39
- Cover art sent to the car/lock screen is now resized and compressed to a small 512x512 JPEG before it's handed to MediaSession, instead of the original image at whatever size and aspect ratio it came in at. The car gets cover art over Bluetooth (AVRCP), which is much stricter about image size/format than the iPhone's own lock screen — a big or non-square image can work fine on the lock screen and simply never arrive at the car. The event log now also records the before/after size each time, so if art still doesn't show up in the car after this, the log will say exactly what was sent.

## Alpha 1.9.38
- Added a "copy link to this song" button: a small link icon on every track row (Browse folders, All songs, Recent) and one on the Now Playing screen. Tapping it copies a shareable link to the clipboard and briefly turns the icon green to confirm.
- Opening a shared song link now auto-adds the library if needed (same as the existing library share links) and cues up that specific song in its folder's order, ready to play — if the browser won't auto-start it (common on a cold open), it's loaded and waiting for a tap on Play, same as the existing "tap to resume" behavior elsewhere in the app.

## Alpha 1.9.37
- The "How it works" guide's "How to set up your own Drive folder" topic now mentions dropping a square cover image into a folder — this was already supported by the app (any JPG/PNG/WEBP image in a song's folder becomes that folder's cover art), it just wasn't documented anywhere until now.

## Alpha 1.9.36
- "How to use" is now "How it works" in the ⋯ menu, and opens to a list of 5 topics instead of one long page: Hi-Fi45 overview, Connecting to someone else's Drive folder, How to set up your own Drive folder, Connecting to your own Drive folder, and Allowing someone else access to your own Drive folder.
- A bandmate who wants to host their own music (not just join yours) now has a guide for that too — creating a folder, adding it as a library, and sharing it with others.
- Added a back arrow in the guide's header to return to the topic list; the X still closes the whole guide from anywhere, and Escape steps back one level before closing.

## Alpha 1.9.35
- Added a "How to use" guide to the ⋯ menu, for bandmates getting started: connecting Drive, getting added to a shared library, switching libraries, browsing and playing, and what the LEVEL button does. It's available even before connecting Drive.
- Tested the existing "add another library" feature end to end: pasting a Drive folder link, switching between libraries with separate caches, sharing a library by link, and the message shown when you don't have access to a folder. All of it already worked; no code changes were needed there.
- Bumped service-worker cache to mymusic-shell-v1-9-35.

## Alpha 1.9.34
- REW / previous (the on-screen button, the lock screen and the car's previous button) no longer jumps to the previous track — that always meant a fresh download, which could look broken on a slow car connection. It now only restarts the current song, every time, from anywhere in the track.
- After a restart, the button is disabled for 4 seconds (grayed out on screen; the lock screen / car press does nothing) so a second press right after doesn't restart the song again pointlessly. It re-enables after 4 seconds.
- Log line: rewind.
- Bumped service-worker cache to mymusic-shell-v1-9-34.

## Alpha 1.9.33
- Next / previous should now also work instantly in the middle of a song, not just right before it ends. The spare player used to load the next song only in the last 40 seconds; it now starts loading as soon as the current song begins, so a next/previous press anywhere in the song can use the instant swap from 1.9.32, including with the screen locked or the car disconnected from the phone's internet.
- Cover art sent to the lock screen and car is no longer a blob: link, which those screens can't open; it's now a plain embedded image, and the lock screen / car are told to refresh it once the art finishes loading (art can arrive a moment after the song starts playing).
- The play/pause icon and the lock screen / car's own play/pause state are now set directly from the real player state every time it's checked, instead of drifting out of sync after a stall or a background hiccup. Likewise, the song's position is now reported to the lock screen and car, which should make their scrubber track correctly.
- Log line prefetch-start now says "at M:SS of current song" instead of "with N s left", since prefetching can now start right at 0:00.
- Bumped service-worker cache to mymusic-shell-v1-9-33.

## Alpha 1.9.32
- Songs should now advance with the screen locked. The app now has a second, spare player: the next song is decoded into it while the current one is still playing, so a track change is a swap between two players instead of loading a new file. Loading a new file is what iPhone refuses to do while the screen is locked, which is why songs used to sit at 0:00 until the phone was unlocked.
- Because the next song is already in memory, a swap needs no internet and no Drive sign-in. If the sign-in expires mid-drive, or Drive is unreachable, an already-loaded next song still plays.
- Next / previous (on the car screen, the lock screen and in the app) now play instantly when the next song is ready, instead of starting a fresh download.
- Pressing next several times quickly no longer piles up downloads: the newest press wins and older downloads are cancelled. Before, six presses started six downloads that fought each other over the car's connection, and several songs were skipped.
- Prefetching now starts 40 seconds before the end of a song (was 25) to leave time to decode, and a song already downloaded is never downloaded a second time.
- Event log additions: track-swap (played from the spare player, with how long it took), standby-ready / standby-slow (how quickly the next song became ready), track-cancelled and dl-cancelled (superseded presses), reuse-download, audio-primed.
- Log fix: different songs no longer collapse into one "(x2)" line. Each file is now tracked separately, and the small file fetched at startup is labelled "order" instead of looking like a song.
- Bumped service-worker cache to mymusic-shell-v1-9-32.

## Alpha 1.9.31
- Event log now records lock-screen / car / headset button presses (media-button: play, pause, previous, next, with the song position) so we can see whether the Tesla's buttons reach the app. Look for "media-button" and "media-session" lines.
- The lock screen and car controls now offer previous / next track instead of ±15 second skip (the app no longer registers the seek buttons with the phone; the on-screen 15 s buttons are unchanged).
- When iPhone refuses to autostart a song (the "request is not allowed by the user agent" alert on the first song after opening the app), the song is now left loaded and the status says "Ready · tap play to start" instead of showing an error alert. The log line is play-needs-tap.
- Bumped service-worker cache to mymusic-shell-v1-9-31.

## Alpha 1.9.30
- Level readout: under LEVEL on the deck it now shows the loudness change applied to the song that's playing (for example +4.7 dB or −2.1 dB; 0.0 dB if the song was already at the target), "…" while a song is being prepared, and OFF when Level is off. It updates on every song, including when Level was already on when you opened the app. "—" means Level couldn't process that song (very long file or an error) and it's playing as-is.
- Bumped service-worker cache to mymusic-shell-v1-9-30.

## Alpha 1.9.29
- The Connect / Reconnect Drive button moved from the header to the right of "Your library", so the logo row isn't crowded. The header is now just the logo and the ⋯ menu. The button works exactly as before.
- Bumped service-worker cache to mymusic-shell-v1-9-29.

## Alpha 1.9.28
- New ⋯ menu button in the top right of the header, next to Connect / Reconnect (which stays where it was).
- The menu holds Libraries and Rescan this library (moved from the Your library heading; they work exactly as before and only show once you're connected) and Event log (testing).
- The 5-taps-on-the-version-label way of opening the event log is gone (iPhone ignored it); use the menu instead. The log itself is unchanged from 1.9.27.
- Bumped service-worker cache to mymusic-shell-v1-9-28.

## Alpha 1.9.27
- Event log for tracking down the "song didn't load" and "next song didn't start in the car" problems. Nothing about playback, layout or sign-in changed.
- Open it by tapping the version label (ALPHA 1.9.27, bottom of the player) 5 times quickly. Buttons: Share (sends the log by Messages, Mail, etc.), Copy, Clear, Close. Also available in the browser console as HiFi45App.getLog().
- It keeps the last 400 events on the phone (survives iOS reloading the page): app start, screen lock / unlock (V = page visible, H = hidden), song start and end, whether the next song was ready, every download (size, time, error codes; Drive 403 reasons), prefetch start / finish / fail, Level timings, sign-in requests, renewals and expiry, and audio errors or stalls.
- Repeated identical failures are collapsed into one line with a count.
- Bumped service-worker cache to mymusic-shell-v1-9-27.

## Alpha 1.9.26
- Custom order: in Browse folders, tap Edit order, drag the ≡ handles to reorder folders and songs, then tap Done. "Reset to A–Z" clears the order for that folder.
- The order is saved in hifi45-order.json in the library's top folder (one file per library), so everyone who opens the library gets the same order. Folders and songs that aren't in the order (e.g. newly added) go at the end, A–Z. Deleting the file puts everything back to A–Z.
- Saving to Drive needs permission to edit Drive files. Hi-Fi45 asks for it the first time you tap Done; it only ever writes hifi45-order.json. People who can only view the folder never get asked: their reordering is saved on their own device.
- The order is used everywhere: Browse, playing a folder, Up next, All songs (folders in your order, each folder's songs in your order).
- A–Z ordering is now natural ("Track 2" before "Track 10").
- Song lists saved by older versions are rescanned once in the background (needed for All songs to follow folder order).
- Song titles in Browse are left-aligned.
- Bumped service-worker cache to mymusic-shell-v1-9-26.

## Alpha 1.9.25
- Home-screen app: the page now asks iOS for a solid black status bar (apple-mobile-web-app-status-bar-style "black", theme colour black), the same setup that keeps the fade out of AirWar Pacific. Remove the Hi-Fi45 icon from the Home Screen and add it again once, because iOS only reads this when the app is added.
- Phones: the logo row also sits 18pt lower for breathing room under the status bar. The gaps around "Your library" were tightened by the same amount, so the home screen still fits without scrolling.
- Bumped service-worker cache to mymusic-shell-v1-9-25.

## Alpha 1.9.24
- Libraries: a new Libraries button (next to the round Rescan button) lists every Drive folder you've added. Tap one to switch; each library keeps its own saved song list, so switching back is instant.
- Add a library by pasting a Google Drive folder link (or folder ID). The app checks you can open it and uses the folder's real name.
- Share: Browse folders has a Share button that copies a link to the folder you're in (…/mymusic/?lib=<folder id>). Opening that link adds the folder to the person's Libraries and opens it; the ?lib= part is then removed from the address bar.
- No access: if a library hasn't been shared with the signed-in Google account, the app says so in plain words instead of showing an error.
- Remove a library from the list with ×. This only removes it from Hi-Fi45; nothing in Drive changes.
- Songs in a library that starts below your top-level folder show the library name as the artist (e.g. "Sugar Business · James").
- Your existing MyMusic library, history and settings carry over unchanged.
- Bumped service-worker cache to mymusic-shell-v1-9-24.

## Alpha 1.9.23
- Renamed the app to Hi-Fi45 (tagline unchanged: "Your music. Your groove.").
- New app icon (the "45" record) for the header, browser tab, home-screen icon and installed app.
- New artwork for songs without cover art (no-art.jpg), shown full-bleed everywhere.
- Fixed: cover art flashed the default picture for a moment when the song changed. The current art now stays until the next one is ready, and isn't reloaded at all when the next song uses the same image.
- Bumped service-worker cache to mymusic-shell-v1-9-23.

## Alpha 1.9.22
- Renamed the app to Drive45, tagline "Your music. Your groove." (page title, header, welcome text, home-screen app name, pop-out window title). Visuals unchanged.
- The breadcrumb root still says "MyMusic" because that's the name of the Drive folder itself.
- Saved settings (sign-in, library cache, history, Level, volume, pop-out size) keep their existing storage keys, so nothing resets.
- Console helper is now Drive45App (MyMusicApp still works).
- Bumped service-worker cache to mymusic-shell-v1-9-22.

## Alpha 1.9.21
- Fixed: closing the pop-out could leave the main page empty. Bringing the player back now runs exactly once, moves the player first, and guards every step, so one failure can't stop the rest. A backup check also restores the player if Chrome doesn't report the window closing.
- Fixed: the pop-out could open shrunk to 40% and stuck at the top. Chrome can report a zero window size for a moment while the pop-out opens; the layout now waits for a real size and refits several times during the first second.
- The pop-out layout never cuts off its top edge, even if it can't fit the window.
- Bumped service-worker cache to mymusic-shell-v1-9-21.

## Alpha 1.9.20
- index.html now loads styles.css and app.js with the version in the address (styles.css?v=1.9.20). GitHub Pages' servers can keep serving the previous copy of a file for several minutes after an upload, which could show a new version number with an old layout (seen with 1.9.19's desktop layout). Each release now has its own file addresses, so that can't happen.
- No visual changes from 1.9.19.
- Bumped service-worker cache to mymusic-shell-v1-9-20.

## Alpha 1.9.19
- Pop-out: everything below the track name moved up (no stretched gap) and there's ~26pt of padding under the VOL / version labels. The pop-out measures its own content, so the window shape is a little shorter (about 390×786).
- Desktop and large landscape screens (900pt+ wide, landscape): the expanded view puts the cover art on the left and the title, seek bar, buttons and deck on the right, both vertically centered. The art is larger (up to 760pt), has no fade, and gets rounded corners with a soft shadow.
- Bumped service-worker cache to mymusic-shell-v1-9-19.

## Alpha 1.9.18
- Fixed: the VU meter froze in the pop-out when the original tab was in the background. Its animation now runs on whichever window is showing the player, and switches when you pop out or bring it back.
- VU needle is protected against timing jumps between windows.
- Bumped service-worker cache to mymusic-shell-v1-9-18.

## Alpha 1.9.17
- Pop-out shows the full expanded player including Browse folders; the song picker opens inside the pop-out, and picking a song plays it there.
- Pop-out layout is laid out at the phone design's 390×800 proportions and scaled to fit the window, so spacing never changes when you resize; extra width or height becomes background.
- First pop-out opens at about 90% of your screen's usable height (clear of the menu bar and Dock) at the matching width; after you resize it, it reopens at your size.
- Escape closes the picker inside the pop-out.
- Bumped service-worker cache to mymusic-shell-v1-9-17.

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
