# Production distribution and release checklist

This document is for maintainers preparing the **0.5.0** release. The source tree includes separate Android, Android TV, iOS, web, Samsung Tizen, LG webOS and Windows configurations. Successful compilation does **not** establish platform approval, broadcaster rights or reliable playback on every target device.

## Release gates

- [ ] Confirm broadcasting/embedding/redistribution permission for **every** channel included in commercial distribution, including territory restrictions and downstream stream-provider terms. A public URL is not a content license.
- [ ] Verify the catalog can be refreshed and loaded offline from the bundled JSON snapshot. Review stream status/codec/DRM limitations.
- [ ] Verify app identity and publishing ownership: `com.brendigo.iptv`, `com.brendigo.iptv.tv`, Tizen application and webOS application IDs. Do not change after publication.
- [ ] Validate privacy notice, store declarations and any local regulations affecting TV distribution; confirm local favorites and third-party host connections are correctly disclosed.
- [ ] Use approved original product icons, screenshots, banners, store descriptions and translations. Generated CI icons are functional packaging assets; brand review is still required.
- [ ] Physically install and launch Android APK, Android TV APK, iOS IPA, Samsung WGT and LG IPK; test backgrounding, resume, remote navigation, language, playback, EPG, error handling and recovery.
- [ ] Verify release signing, package signatures and installation from the relevant store delivery track, including store policies.
- [ ] Publish a release only when full CI is green and signing/playback/rights evidence exists.

## Artifact integrity

[Platform CI](../.github/workflows/player-ci.yml) builds/tests the shared interface, independently generated platform bundles, Android debug APK, Android TV Leanback debug APK, **unsigned** Android release AABs, unsigned iOS Simulator app and LG webOS IPK. Samsung TV staging is checked, not signed. The pipeline validates that required launcher/store images exist and that package versions match.

Default CI uses no production credentials. Generated source/platform folders are not hand-edited before a release; build scripts produce them from versioned configuration.

## GitHub production environment secrets

Create a protected GitHub **environment named `production`**. Restrict authorized deployers and optionally require reviewers. Add the secrets below without committing them, echoing them in logs or posting them in chat.

### Android / Android TV

- `ANDROID_RELEASE_KEYSTORE_BASE64`: base64 of the actual signing keystore
- `ANDROID_RELEASE_STORE_PASSWORD`: keystore password
- `ANDROID_RELEASE_KEY_ALIAS`: signing key alias
- `ANDROID_RELEASE_KEY_PASSWORD`: signing key password

Use **Actions → Signed production distributions → Run workflow → android** (or `android-tv`). The job validates the keystore and builds a **signed release AAB**, uploaded as an expiring artifact. Protect the keystore outside GitHub; store rollout/upload remains a separate approved action. Reuse of one key across targets must be a deliberate business decision.

### iOS

- `IOS_DISTRIBUTION_P12_BASE64`: base64 distribution signing identity
- `IOS_DISTRIBUTION_P12_PASSWORD`: password of the P12 file
- `IOS_PROVISIONING_PROFILE_BASE64`: base64 App Store provisioning profile for the app ID
- `IOS_TEAM_ID`: Apple developer team ID
- `IOS_PROVISIONING_PROFILE_NAME`: profile name matching the installed signing identity
- `IOS_KEYCHAIN_PASSWORD`: temporary CI keychain encryption password

Select **ios** in the same protected workflow. It creates an Xcode archive and exports a signed IPA only when all signing credentials exist. Register devices and conduct a TestFlight smoke test before submission.

### LG webOS

The CI now generates the required 80×80 and 130×130 launcher icons and an `.ipk` with the current webOS CLI. An IPK alone does not demonstrate LG Seller Lounge approval or compatibility across TV generations. Validate physical device installation, playback, focus and approved icon/marketing assets.

### Samsung Tizen

The CI creates the Samsung TV-specific web widget staging directory and 117×117 icon. A signed `.wgt` requires Tizen Studio, a Samsung TV certificate profile, the publisher's package identity and access to a supported build system. A manual signed workflow also supports **samsung-tizen** when a protected **self-hosted Linux runner labeled `tizen`** has Tizen Studio configured. Store the signing profile name as `TIZEN_CERTIFICATE_PROFILE` in the `production` environment. A runner, certificate and publisher account are not supplied by this repository.

With the proper local credentials, use:

```bash
tizen build-web -- platforms/samsung-tizen/staging
tizen package -t wgt -s YOUR_CERTIFICATE_PROFILE -- platforms/samsung-tizen/staging/.buildResult
```

Verify the generated WGT and its author/distributor signatures. Do not upload a placeholder or self-signed development package to the production TV store.

## Known external constraints

Playback depends on third-party remote servers, CORS, geographic authorization, HTTP/HTTPS restrictions, supported audio/video codecs and DRM. A channel can appear in the directory and still fail to play. The application cannot legitimately bypass restrictions and cannot guarantee uninterrupted service.

No signing secrets, broadcaster distribution licenses or physical-device verification data are present in this repository. Those external requirements must be completed before describing the application as fully production released.
