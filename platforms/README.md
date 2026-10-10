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
| `windows/` | Desktop Setup EXE and Portable EXE |

Windows evaluation executables are not Authenticode-signed. The staging directories are not signed TV Store artifacts. Store binaries require appropriate SDKs, valid identities and physical-device certification.
