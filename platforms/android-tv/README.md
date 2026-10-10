# Android TV / Google TV

Independent TV app ID and release package with Leanback launcher support and Android TV-specific banner.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs android-tv
cd platforms/android-tv
npm install && npx cap add android && npx cap sync android
cd ../..
node scripts/patch-android-tv.mjs
node scripts/configure-android-release.mjs android-tv
node scripts/generate-app-icons.mjs android-tv
node scripts/verify-release-assets.mjs android-tv
cd platforms/android-tv/android
./gradlew assembleDebug bundleRelease
```

**CI artifacts:** `iptv-android-tv-debug-apk`, `iptv-android-tv-release-aab-unsigned`. Signed AAB requires a production keystore. Physical DPAD/focus, codec and Google Play TV policy tests remain mandatory.
