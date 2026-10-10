# Android

Dedicated Android phone/tablet project. Shared UI is built in `apps/player`; this directory owns Android packaging and application identity.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs android
cd platforms/android
npm install
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

**CI artifact:** `iptv-android-debug-apk`. This is a debug-signed installable test build; publishing an AAB requires keystore/signing, store compliance and physical-device QA.

Do not commit generated Android projects, signing keys or developer credentials. The CI pipeline regenerates native sources deterministically.
