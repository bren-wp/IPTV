# iOS and iPadOS

Dedicated iPhone/iPad package, Xcode project and signing configuration.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs ios
cd platforms/ios
npm install && npx cap add ios && npx cap sync ios
cd ../..
node scripts/generate-app-icons.mjs ios
node scripts/verify-release-assets.mjs ios
open platforms/ios/ios/App/App.xcworkspace
```

**CI artifact:** `iptv-ios-simulator-app` (unsigned simulator app). The protected [signed production workflow](../../.github/workflows/release-distributions.yml) archives and exports an IPA only when Apple signing credentials and the matching App Store provisioning profile are configured. TestFlight and physical iPhone/iPad QA remain required.
