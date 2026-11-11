# Two Minds for Android

A small native shell (one Activity, no libraries) around the web game.

## Getting the app
Every push to `android-app` or `main` runs `.github/workflows/android.yml`, which builds the APK and publishes it at
**https://github.com/Dante3750/two-minds/releases/tag/android-latest**. Open that page on the phone, download
`two-minds.apk`, open it and allow the install. Later builds install over the old one and keep progress.

## What the shell adds over the browser version
- Full screen, app icon, splash, system bars coloured to the chosen theme, screen stays on.
- Works with no internet from the first launch (the page is bundled). When the live site has a newer build, the app uses that, so most updates need no new APK.
- The system share sheet and clipboard for challenge links.
- The back button walks back through the game's screens.
- Game links open in the app: turn it on once under Settings → Apps → Two Minds → Open by default → Add link → `dante3750.github.io`. Or long-press a link in a chat → Share → Two Minds. Or paste the link in Friends → "Friend code or a pasted link".

Progress in the app is separate from progress in Chrome (Android keeps them apart). The friend code is per install, so add each other again from the app.

## Building locally
Needs JDK 17, Gradle 8.9+ and the Android SDK (platform 35).

    python3 build.py                      # also copies the page into android/app/src/main/assets/www
    cd android && gradle assembleRelease  # APK: app/build/outputs/apk/release/app-release.apk

## Signing
`app/sideload.keystore` (password `twominds`) is committed on purpose: every build is signed with the same key, so
updates install over each other. It is fine for sharing the APK directly. It is **not** suitable for Google Play, and
anyone can sign an APK with it, so only install builds from this repository's release page.

To use a private key instead, add these repository secrets and the workflow picks them up:
`ANDROID_KEYSTORE_B64` (the keystore, base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
Switching keys means uninstalling the old app once.
