# LG webOS TV

Separate webOS web app with its own `appinfo.json` and generated web assets.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs lg-webos
```

Generated directory: `platforms/lg-webos/staging/`.
CI artifact: `iptv-lg-webos-staging` (unsigned staging **not** an `.ipk`).

An 80x80 PNG icon is required in the staging directory before invoking `ares-package` via the LG webOS TV CLI. Final installation, remote controls, CORS, codecs and stream behavior must be validated on actual LG devices.
