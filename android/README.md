# Two Minds for Android (native)

Kotlin + Jetpack Compose. No web code inside: every screen is native Compose UI.
The app talks to the Supabase backend in `supabase/` over plain HTTPS (`data/Api.kt`), using the
public project URL and anon key from `android/supabase.properties`.

## Getting the app
Every push to `native-app` runs `.github/workflows/android.yml`: backend tests, then the APK, published at
**https://github.com/Dante3750/two-minds/releases/tag/android-native**. Open that page on the phone, download
`two-minds-native.apk`, open it and allow the install. It installs over the earlier Two Minds app (same signature).

## Layout
- `MainActivity.kt`, `App.kt`, `AppState.kt`: activity, screen switching, back button, sheets, toasts, shared state
- `data/`: server client (`Api.kt`), typed calls and models (`Game.kt`), levels/titles/badges (`Rules.kt`)
- `ui/`: theme and fonts, building blocks (`Kit.kt`), icons (`IconPaths.kt`, generated), sounds and vibration (`Sfx.kt`)
- `screens/`: one file per area (sign-in, home, topics, play, results, friends, profile, couple, waiting rooms)

## Building locally
JDK 17, Gradle 8.9+ and the Android SDK (platform 35): `cd android && gradle assembleRelease`.

## Signing
`app/sideload.keystore` (password `twominds`) is committed on purpose so every build installs over the last one.
Fine for sharing the APK directly, not for Google Play. Set `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`,
`KEY_PASSWORD` to use a private key instead.
