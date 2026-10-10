<div align="center">

<img src="apps/player/public/brand-logo.svg" alt="IPTV" width="300" />

# One App. Every Screen.
### Live TV, beautifully organized.

**Live channels · Worldwide discovery · TV guide · Personal favorites**

[![Platform builds](https://github.com/bren-wp/IPTV/actions/workflows/player-ci.yml/badge.svg)](https://github.com/bren-wp/IPTV/actions/workflows/player-ci.yml)
[![Catalog updates](https://github.com/bren-wp/IPTV/actions/workflows/catalog-sync.yml/badge.svg)](https://github.com/bren-wp/IPTV/actions/workflows/catalog-sync.yml)

**Android · iOS · Android TV · Samsung Smart TV · LG Smart TV · Web**

</div>

---

## Television, simplified

Discover publicly accessible live-TV channels in one beautifully organized interface. Search across countries and categories, switch between available broadcasts, and keep the channels you love close.

Designed for a wide range of screens, from your phone to your living-room TV.

### Highlights

| Discover | Watch | Personalize |
| --- | --- | --- |
| Explore channels across countries and genres | Live HLS video with source selection | Build your favorites collection |
| Search instantly by channel name | View programme schedules when available | Keep preferences on your device |
| Filter by region and category | Navigate with touch, keyboard or remote focus | Refresh the channel directory automatically |

### Designed for every screen

The same premium blue-on-navy design now powers all six platform packages. It includes a cinematic Home screen, accessible channel cards, category navigation, on-demand TV guide, a responsive mobile tab bar and TV remote/keyboard focus states.

![IPTV brand icon](apps/player/public/brand-symbol.svg)

The channel tiles reflect actual live streams and their metadata. Movies and Series identify television-channel categories, not a fictitious on-demand movie library. The [design system](docs/UI_BRAND_GUIDE.md) documents color tokens, navigation, focus styles and remaining device-level QA.

### Thoughtful by design

- **Beautiful dark interface.** Spacious cards, clean typography, accessible controls and adaptive layouts.
- **Live, not stale.** Scheduled directory updates plus automatic refresh while the application is open.
- **Your channels, your way.** Store favorites locally without account creation.
- **More context.** Optional programme guide with *on now* and *up next* information.
- **Resilient by default.** Multiple stream choices where available, URL validation, error handling and cached directory fallback.
- **Privacy-minded.** No built-in advertising SDK or analytics tracking.

## Platforms

Each delivery target has a dedicated directory with its own configuration and packaging workflow. The playback interface and channel logic are shared to keep behavior consistent.

| Platform | Directory | Delivery status |
| --- | --- | --- |
| Android mobile | [`platforms/android/`](platforms/android/) | Debug APK and unsigned release AAB CI; signed production AAB gated on credentials |
| iPhone & iPad | [`platforms/ios/`](platforms/ios/) | iOS Simulator CI and gated signed IPA workflow; Apple credentials and device QA required |
| Android TV / Google TV | [`platforms/android-tv/`](platforms/android-tv/) | Leanback APK and unsigned AAB CI; signed bundle and TV QA required |
| Samsung Tizen | [`platforms/samsung-tizen/`](platforms/samsung-tizen/) | Dedicated TV web bundle and manifest; signed WGT pending |
| LG webOS | [`platforms/lg-webos/`](platforms/lg-webos/) | Separate packageable IPK CI with platform icon assets; device/store QA pending |
| Web | [`platforms/web/`](platforms/web/) | Production static bundle built in CI |

> **Development status:** The web interface, Android debug APK and unsigned iOS simulator builds are compiled in CI. Platform signing, Smart TV certification, real-device quality assurance and content-rights review are not complete. A successful build is not a guarantee that a remote channel will play.

## Project structure

```text
IPTV/
├── apps/
│   └── player/             Shared React + TypeScript player, EPG and directory
├── platforms/
│   ├── android/            Android app, Capacitor configuration
│   ├── ios/                iPhone/iPad app, Capacitor configuration
│   ├── android-tv/         Android TV app and Leanback integration
│   ├── samsung-tizen/      Samsung TV web bundle and Tizen manifest
│   ├── lg-webos/           LG TV web bundle and webOS app metadata
│   └── web/                Independent browser build
├── scripts/                Platform bundling and Android TV configuration
└── .github/workflows/      Platform CI and scheduled directory updates
```

Every target can be prepared independently. Platform bundles are **derived from tested shared sources**, not six divergent copies of the same UI.

## Develop

Requirements: Node.js **22+**, plus the platform SDK for the relevant target.

```bash
cd apps/player
npm install
npm run typecheck
npm test
npm run build
```

Preview locally:

```bash
cd apps/player
npm run dev
```

Prepare the separate platform bundles (run after the shared web build):

```bash
node scripts/prepare-platform.mjs web android ios android-tv lg-webos samsung-tizen
```

### Mobile and Android TV builds

For Android:

```bash
cd platforms/android
npm install
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

For iOS, follow the same workflow in `platforms/ios/`, using `npx cap add ios` / `npx cap sync ios`, then build with Xcode on macOS. Device installation and App Store submission require Apple signing.

For Android TV, use `platforms/android-tv/`, then run `node ../../scripts/patch-android-tv.mjs` after `npx cap add android`, before Gradle compilation.

### Smart TV and web builds

The platform bundler prepares `platforms/samsung-tizen/staging/`, `platforms/lg-webos/staging/` and `platforms/web/dist/`. Samsung `.wgt` packaging requires Tizen Studio and a valid Samsung certificate. LG `.ipk` packaging is automated in CI with the current webOS CLI and mandatory icon assets; TV Seller Lounge acceptance and physical-device QA remain pending.

## Automatic catalog updates

Channel metadata is refreshed in-app and synchronized on the GitHub default branch every six hours. The update job validates the generated directory and avoids committing identical output. The last valid snapshot is retained if the upstream service fails. Video is played directly from the third-party providers; this repository does not host or rebroadcast TV streams.

**Note:** Schedules and streams depend on the broadcaster. Some channels may be unavailable, restricted geographically, DRM-protected or incompatible with particular devices.

## GitHub releases

**[IPTV v0.4.0 — Preview downloads](https://github.com/bren-wp/IPTV/releases/tag/v0.4.0)**

The release pipeline publishes downloadable **Android debug APK**, **Android/Android TV unsigned AAB**, **Android TV debug APK**, **LG webOS IPK**, **iOS Simulator build**, **Samsung Tizen staging ZIP**, **Web ZIP** and SHA-256 checksums, but only after every platform CI job succeeds on the `main` branch. Check the release page for actual availability.

These preview binaries are not certified, production-signed app-store submissions. See [v0.4.0 release notes](docs/releases/v0.4.0.md) and the [production release checklist](docs/PRODUCTION_RELEASE.md).

## Downloads and development builds

Open [**GitHub Actions → Player CI**](https://github.com/bren-wp/IPTV/actions/workflows/player-ci.yml) to find the artifacts produced by successful builds. Debug APKs are for testing; iOS Simulator artifacts are not signed IPA files.

## Production distribution

The [signed production workflow](.github/workflows/release-distributions.yml) supports Android/Android TV signed AABs and iOS signed IPA export when the required encrypted GitHub Environment credentials have been configured. Debug and unsigned outputs are **not** Play Store or App Store releases.

Before shipping publicly, complete the [Production release checklist](docs/PRODUCTION_RELEASE.md). Release blockers include platform signing certificates, broadcaster distribution rights, Samsung TV certificates, store assets and real-device playback/remote testing. The CI pipeline deliberately does not call an unverified build "production ready".

## Privacy and responsible distribution

- Favorites remain in local device storage; there is no user account or application telemetry.
- Playing a channel connects the device to external stream hosts, which may receive connection metadata.
- Publicly accessible links do **not** themselves grant redistribution, commercial exhibition or rebroadcast rights.
- Broadcasting permissions, streaming restrictions, platform-store requirements and content rights must be verified before a public commercial release.

---

<div align="center">

**Find it. Watch it. Love it.**

Made for a better live-TV experience.

</div>
