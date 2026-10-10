# Android TV / Google TV

Separate TV installation package and app identifier, including Leanback launcher category, non-touchscreen hardware support and a TV-specific drawable banner.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs android-tv
cd platforms/android-tv
npm install
npx cap add android
npx cap sync android
cd ../..
node scripts/patch-android-tv.mjs
cd platforms/android-tv/android
./gradlew assembleDebug
```

**CI artifact:** `iptv-android-tv-debug-apk`. DPAD focus logic exists in the shared application, but physical remote tests, Play TV eligibility, leanback banner review and video decoder compatibility checks remain mandatory.
