<div align="center">
<img src="apps/player/public/brand-logo.svg" alt="IPTV" width="300" />

# IPTV — One App. Every Screen.
**Premium live-TV discovery and playback for Android, Android TV, iPhone/iPad, Windows and Smart TVs.**

[![Platform CI](https://github.com/bren-wp/IPTV/actions/workflows/player-ci.yml/badge.svg)](https://github.com/bren-wp/IPTV/actions/workflows/player-ci.yml)
[![Catalog sync](https://github.com/bren-wp/IPTV/actions/workflows/catalog-sync.yml/badge.svg)](https://github.com/bren-wp/IPTV/actions/workflows/catalog-sync.yml)

[Latest app release](https://github.com/bren-wp/IPTV/releases/latest) · [Platform documentation](docs/INDEX.md) · [Production checklist](docs/PRODUCTION_RELEASE.md)
</div>

## Features
- Browse verified catalogue metadata with authentic channel names from the upstream directory, country and category filters, search and locally stored favorites.
- Play third-party live streams with bounded startup and stall detection, HLS recovery and alternative stream selection when available.
- Read original XMLTV programme titles and times from published guide sources. If metadata is unavailable, the app indicates this rather than inventing programme listings.
- Use the same premium dark navy / electric-blue design with mobile navigation, accessible controls and TV remote focus.
- Refresh catalogue metadata automatically and reuse the last verified snapshot on network failure. Preferences are kept on the device.

**This project does not publish a website or provide a public JSON/M3U API.** The React/Vite player under `apps/player` is an **internal packaging component** for the installed applications, including those using web technologies inside an app container. It is not a browser product or hosting deliverable.

## Platforms and preview downloads

| Target | Source directory | Build / distribution |
| --- | --- | --- |
| Android phones and tablets | [Android](platforms/android/) | Debug APK; unsigned release AAB until the publisher signing workflow runs |
| Android TV / Google TV | [Android TV](platforms/android-tv/) | TV launcher/remote; debug APK, unsigned AAB |
| iPhone / iPad | [iOS](platforms/ios/) | iOS Simulator app; signed IPA gated on Apple identity, provisioning and device QA |
| Windows 10/11 | [Windows](platforms/windows/) | Setup EXE and Portable EXE; unsigned pending Authenticode |
| Samsung Tizen | [Samsung TV](platforms/samsung-tizen/) | Validated TV staging; signed WGT requires publisher certificate and Tizen SDK |
| LG webOS | [LG TV](platforms/lg-webos/) | IPK; compatible-hardware smoke and seller approval still required |

See the [GitHub releases](https://github.com/bren-wp/IPTV/releases) for actual versioned files. A passing build is not evidence of store approval or uninterrupted third-party playback.

## Architecture and testing

All six delivery targets reuse the shared player. There is **no independently hosted website**. `apps/player/dist` is generated temporarily by the build and copied inside app packages.

```bash
npm install --prefix apps/player --no-audit --no-fund
npm --prefix apps/player run typecheck
npm --prefix apps/player test
npm --prefix apps/player run test:e2e
npm --prefix apps/player run build
node scripts/prepare-platform.mjs android android-tv ios windows samsung-tizen lg-webos
```

The platform CI checks type safety, unit/E2E behavior, Android APK/AAB, Android TV, iOS Simulator, Windows Setup/Portable launch, TV staging and LG IPK packaging. Production signing requires protected publisher secrets; they must never be committed.

## Privacy, accuracy and reliability

Local favorites, settings and recent channels need no account. The app fetches third-party channel metadata, artwork, guide data and media; providers can observe network requests and may restrict access. No application-side proxy circumvents CORS, DRM, geoblocking or authorisation.

**Real source names, not invented TV programmes:** channel names and XMLTV titles come from external published catalogues; schedules can be missing or wrong upstream. No guarantee that every source is online, permitted for redistribution, or compatible with every device. Verify rights and playback on physical hardware before retail release.

[Full technical docs](docs/INDEX.md) · [License](LICENSE) · [Release notes](docs/releases/v0.5.3.md)
