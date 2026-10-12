# IPTV for Windows

Dedicated **Windows 10/11 desktop application**, using the shared IPTV React player with Electron's hardened renderer, its own secure `iptv://app` local origin, and the same live channel directory as Android, iOS and the TV/web apps.

## Build

Requires Node.js 22+ and Windows x64 (GitHub Actions uses `windows-latest`).

```powershell
npm install --prefix apps/player
npm --prefix apps/player run build
node scripts/prepare-platform.mjs windows
node scripts/generate-app-icons.mjs windows
node scripts/verify-release-assets.mjs windows
npm install --prefix platforms/windows --no-audit --no-fund
npm --prefix platforms/windows run build:win
```

Outputs are created separately under `platforms/windows/outputs/`:

- `IPTV-Setup-0.5.2.exe` — installer with Start Menu and optional desktop shortcut
- `IPTV-Portable-0.5.2.exe` — standalone portable Windows executable

These are **unsigned evaluation binaries** until an authorized Authenticode certificate is configured. Windows SmartScreen may display an unknown publisher warning. Do not bypass enterprise security policies. Check application rights and test source playback on real Windows hardware prior to distribution.

## Startup and security

The Windows app does not expose Node APIs to the web interface. All content is hosted by a restricted local `iptv://app` protocol with standard browser CORS enabled. External HTTPS links open in the system browser; navigation is blocked within the desktop window. Remote live channel and guide servers may reject streams or block CORS. Stream DRM is not bypassed.

To smoke test the **actual packaged portable EXE** in CI, pass `--smoke-test`; the app loads its bundled index and verifies the IPTV React interface mounts before exiting with an appropriate status.

**Shared experience:** Windows Setup and Portable include the same player, EPG and catalogue update logic as the [public website](../../docs/WEB_HOSTING.md). The website's optional API/M3U endpoints do not require Windows to be installed.
