# MyMusic Player — Alpha 1.3

## Added
- Silent Google Drive authorization attempt on app startup after the user has previously connected.
- Remembers the authorization preference in browser local storage, but never stores Google access tokens or passwords.
- If Google cannot silently authorize (for example, the Google session expired, consent was revoked, or browser privacy settings block it), the app shows the normal Connect Google Drive screen.
- Retains the Alpha 1.2 folder browser, breadcrumb navigation, All songs shortcut, and small player version label (now ALPHA 1.3).

## Important behavior
Google access tokens are short-lived. The app requests a fresh token from Google on startup rather than saving a token locally. Silent reconnection depends on Google's session and browser privacy settings; occasional manual reconnection may still be required.
