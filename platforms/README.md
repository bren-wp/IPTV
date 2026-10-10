# Platform packages

The same application logic lives in [`apps/player`](../apps/player). Each platform directory owns its metadata, identity, output and platform-specific assembly steps.

| Directory | Build output |
| --- | --- |
| `android/` | Android debug APK |
| `ios/` | Unsigned iOS simulator app |
| `android-tv/` | Separate Android TV debug APK |
| `samsung-tizen/` | Samsung TV staging directory |
| `lg-webos/` | LG TV staging directory |
| `web/` | Production browser bundle |

The staging directories are not signed TV Store artifacts. Store binaries require appropriate SDKs, valid identities and physical-device certification.
