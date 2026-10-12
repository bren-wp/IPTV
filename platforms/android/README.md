# Android

Dedicated phone/tablet package. Shared playback code lives in `apps/player/`; Android release identity and signing are separate.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs android
cd platforms/android
npm install && npx cap add android && npx cap sync android
cd ../..
node scripts/configure-android-release.mjs android
node scripts/generate-app-icons.mjs android
node scripts/verify-release-assets.mjs android
cd platforms/android/android
./gradlew assembleDebug bundleRelease
```

**CI artifacts:** `iptv-android-debug-apk`, `iptv-android-release-aab-unsigned`. The separately protected [signed production workflow](../../.github/workflows/release-distributions.yml) generates a signed AAB once keystore secrets are configured. Publishing also requires rights verification, store checks and device QA. Never commit private keys.

**Shared experience:** the Android package uses the same premium IPTV catalogue, TV guide and player UI as [the public website](../../docs/WEB_HOSTING.md). Live metadata refresh and offline directory fallback are shared. The website has separate optional JSON/M3U endpoints; Android APK/AAB installation does not depend on the website being configured.
