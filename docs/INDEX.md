# IPTV app documentation

The application targets **Android, Android TV, iOS/iPadOS, Windows, Samsung Tizen and LG webOS**. Product copy and GitHub documentation are in English.

## Product and maintenance
- [Main README](../README.md)
- [Brand guide](UI_BRAND_GUIDE.md)
- [Marketing and store copy](MARKETING.md)
- [v0.5.3 release notes](releases/v0.5.3.md)
- [Production release and signing requirements](PRODUCTION_RELEASE.md)
- [Playlist source review](GITHUB_SOURCES.md)

## Platform-specific instructions
- [Android](../platforms/android/README.md)
- [Android TV / Google TV](../platforms/android-tv/README.md)
- [iPhone / iPad](../platforms/ios/README.md)
- [Windows Setup and Portable](../platforms/windows/README.md)
- [Samsung Tizen](../platforms/samsung-tizen/README.md)
- [LG webOS](../platforms/lg-webos/README.md)

## Automation and accuracy
- [App CI](../.github/workflows/player-ci.yml) — tests and six app platform builds
- [Catalog synchronization](../.github/workflows/catalog-sync.yml) — checked external metadata with last-valid fallback
- [Signed production packages](../.github/workflows/release-distributions.yml) — gated on publisher credentials

No website, public web hosting workflow, browser distribution or public M3U endpoint is part of this product. The shared UI generates only installed app package assets.
