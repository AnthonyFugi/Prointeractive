# .well-known — required for password saving on mobile

Both files here currently contain PLACEHOLDERS. Until they are filled in and
deployed, the "Save password?" prompt cannot appear in the iOS or Android app.
Neither platform will show it for a domain it can't verify the app owns.

Vite copies this whole directory into `dist/` on build, and `firebase.json`
already sets the correct `Content-Type: application/json` headers for both.
Serve them over HTTPS, with no redirect.

---

## apple-app-site-association

Replace `REPLACE_WITH_APPLE_TEAM_ID` (two places) with your Apple Developer
Team ID — the 10-character string at the top right of
developer.apple.com/account, or under Membership details.

No `.json` extension on this file. That is correct; Apple requires it.

`app.json` already declares `webcredentials:prointapp.com`, so nothing changes
on the app side.

## assetlinks.json

Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` (two places) with the **SHA-256**
of the Play app signing key — the same Play Console page where the SHA-1 was
found for Google Sign-In:

    Protected with Play -> Play Store protection -> Manage Play app signing
    -> App signing key certificate -> SHA-256

Use the app signing certificate, NOT the upload certificate. Google Play
re-signs the app with its own key on the way to devices, so the upload key is
not what Android checks at runtime — the same distinction that caused the
DEVELOPER_ERROR on Google Sign-In.

If you also want autofill to work in local debug builds, add your debug
keystore's SHA-256 as a second entry in the `sha256_cert_fingerprints` array.

---

## Verifying after deploy

    curl -sI https://prointapp.com/.well-known/apple-app-site-association | head -3
    curl -s  https://prointapp.com/.well-known/assetlinks.json

Both must return 200 with `application/json` and no redirect.

Android's own checker:

    https://developers.google.com/digital-asset-links/tools/generator

iOS caches the AASA through Apple's CDN. After deploying, delete and reinstall
the app to pick up the change rather than waiting on the cache.
