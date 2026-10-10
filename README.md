# IPTV

Cross-platform live-TV directory and player built around the publicly available [iptv-org](https://github.com/iptv-org/iptv) channel catalog.

> **Project status:** Initial working application implementation. Web build and automated tests are configured, with an Android debug build workflow. iOS and Smart TV distribution builds have **not** yet been validated or published. Availability of individual streams is not guaranteed.

## Supported targets

| Target | Current implementation |
| --- | --- |
| Modern web browsers | React + TypeScript + Vite interface, native video and HLS.js playback |
| Android phones and tablets | Capacitor configuration + automated debug APK build on CI |
| Android TV / Google TV | Responsive web UI and keyboard/remote directional focus handling; platform certification and real-device QA pending |
| iPhone / iPad | Capacitor project configuration; Xcode build, signing and real-device QA pending |
| Samsung Tizen / LG webOS | TV-friendly browser UI; store packages, platform APIs and real-device QA pending |

### Features

- Browse the worldwide IPTV-org catalog, filter by country/category and search channel names.
- Favorite channels (stored locally on the device; no account needed).
- Live HLS playback via browser-native HLS when available or HLS.js.
- Multiple available sources per channel with manual fallback selection.
- Keyboard directional navigation intended for TV remote use.
- Exclude channel entries explicitly classified as NSFW, closed or lacking stream links.
- Automatic catalog refresh every hour while the app is visible.
- Scheduled GitHub Actions snapshot sync every six hours on the default branch, with an unchanged-content check.
- Fallback to the most recently generated local catalog when live API requests fail.

## Develop

Requires **Node.js 22+**.

```sh
cd apps/player
npm install
npm test
npm run typecheck
npm run dev
```

Build the production web bundle:

```sh
cd apps/player
npm run build
npm run preview
```

Synchronize channel metadata to a same-origin JSON snapshot (requires network access):

```sh
cd apps/player
npm run sync:catalog
```

The initial committed snapshot is intentionally empty; the running application loads the public API on first launch. The scheduled sync workflow populates the snapshot once merged to `main` and enabled. GitHub scheduled workflows may be delayed or disabled due to repository settings or inactivity.

### Android

The `IPTV Player CI` workflow builds an **unsigned debug/test APK** and uploads it as a workflow artifact. It is not a production-signed Play Store release. The native project is generated during CI:

```sh
cd apps/player
npm install
npm run build
npx cap add android
npx cap sync android
```

Production Android releases require signing keys, release configuration, target-device tests, store policy review and additional CI hardening. For iOS, use a Mac with Xcode to generate/sync the Capacitor project; Apple signing, entitlements and distribution setup remain required.

### IPTV-org integration

The application reads:
- `https://iptv-org.github.io/api/channels.json`
- `https://iptv-org.github.io/api/streams.json`
- `https://iptv-org.github.io/api/logos.json`

Records are joined by channel ID. Links are validated before use, duplicate URLs within a channel are removed, and changes are reflected without a new app release. The sync job does **not** download or redistribute video streams, and it never tries to bypass stream restrictions.

Some streams require custom HTTP headers, may be geo-restricted, use unsupported codecs, have DRM, or cannot be played due to browser CORS/mixed-content policies. Stream labeling is not a substitute for playback tests from each target region/device. EPG schedules, broadcaster rights verification, TV store packaging, production signing and real-device testing are future work.

## Privacy and legal

No account, application-hosted video stream or telemetry is included. Favorites stay in local storage. Direct playback connects users to third-party streaming servers, which can receive connection information. A publicly listed stream URL is **not proof of permission to redistribute** its content. Review broadcaster rights, licenses, API usage terms and the law applicable to the target markets before public commercial distribution.

Source data: [iptv-org/iptv](https://github.com/iptv-org/iptv), [iptv-org/database](https://github.com/iptv-org/database), [iptv-org/api](https://github.com/iptv-org/api). This app is an independent project, not an official IPTV-org client.

## Development safeguards

GitHub Actions runs TypeScript checks, unit tests and a production web build before attempting the Android APK. Catalog syncs fail closed on malformed or empty upstream responses; the previous snapshot remains intact when sync fails.
