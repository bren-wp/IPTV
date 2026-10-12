# IPTV documentation

Documentation and all public product copy are written in English, with separate Croatian deployment instructions for the web domain.

## Product and visual identity

- [Main product README](../README.md) — positioning, supported features, platforms, testing and downloads.
- [Marketing kit](MARKETING.md) — accurate launch copy, website headlines and store descriptions.
- [UI and brand guide](UI_BRAND_GUIDE.md) — colors, typography, responsive screens, remote focus, logo usage.
- [Release notes](releases/v0.5.1.md) — current published preview distribution details.

## Distribution targets

| Target | Technical documentation | Notes |
| --- | --- | --- |
| Android phones/tablets | [Android](../platforms/android/README.md) | Test APK and unsigned AAB; production signing externally gated |
| iPhone/iPad | [iOS](../platforms/ios/README.md) | Simulator output, Apple distribution IPA requires valid credentials |
| Android TV | [Android TV](../platforms/android-tv/README.md) | Dedicated launcher/banner and DPAD |
| Samsung TV | [Samsung Tizen](../platforms/samsung-tizen/README.md) | Staging, signed WGT requires Samsung TV certificate |
| LG TV | [LG webOS](../platforms/lg-webos/README.md) | IPK, real-device and seller approval remain |
| Windows 10/11 | [Windows](../platforms/windows/README.md) | Separate Setup and Portable EXEs |
| Web | [Web](../platforms/web/README.md) | Production static build with optional hourly deployment |

## Web hosting and public feeds

- [WEB_HOSTING.md](WEB_HOSTING.md) — HTTPS, DNS, self-hosted ZIP, Pages, SSH auto-deploy, JSON and M3U endpoints.
- [POSTAVLJANJE-WEB-HR.md](POSTAVLJANJE-WEB-HR.md) — hrvatske upute za `iptv.icode.com.hr`.
- [Public Pages workflow](../.github/workflows/deploy-web.yml) — optional GitHub-hosted site and hourly catalog publishing.
- [Self-hosted SSH workflow](../.github/workflows/deploy-shared-hosting.yml) — optional private-server deployment with restricted secrets.

## Maintenance and responsibility

- [Production release checklist](PRODUCTION_RELEASE.md) — signing, distribution, content rights and hardware QA.
- [Open-source and playlist sources](GITHUB_SOURCES.md) — verified-source onboarding, compliance and fallback.
- [CI platform builds](../.github/workflows/player-ci.yml) — typecheck, unit/browser scenarios and delivery bundles.
- [Hourly catalog synchronization](../.github/workflows/catalog-sync.yml) — latest valid public snapshot with fallback.

Public listings are not guarantees of channel uptime, playback support or rebroadcast authorization.
