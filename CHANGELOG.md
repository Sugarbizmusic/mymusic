# MyMusic Player — Alpha 1.5

## Folder browser repair and redesign
- Replaced the custom JavaScript accordion toggle with native HTML `details` / `summary`, so opening and closing works without relying on a JavaScript click handler.
- Redesigned the collapsed selector as a compact neutral folder row, separate from the All songs button.
- Folder navigation keeps the accordion open; All songs returns to the root and closes it.
- Folder rows and breadcrumbs use explicit button types and clearer spacing.
- Player version label updated to ALPHA 1.5.

## Retained
- Silent Google Drive reauthorization attempt from Alpha 1.3/1.4 where Google's session permits.
- Supported audio formats and existing playback features.
