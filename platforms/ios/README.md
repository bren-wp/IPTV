# iOS and iPadOS

Dedicated iPhone/iPad Capacitor wrapper with its own iOS project files and build output.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs ios
cd platforms/ios
npm install
npx cap add ios
npx cap sync ios
open ios/App/App.xcworkspace
```

**CI artifact:** `iptv-ios-simulator-app` (unsigned simulator app). App Store/TestFlight requires macOS, an Apple developer team, signing, entitlements, provisioning, signed IPA, and real-device QA.
