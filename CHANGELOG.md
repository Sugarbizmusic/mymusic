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
