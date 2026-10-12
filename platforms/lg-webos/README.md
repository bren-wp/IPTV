# LG webOS TV

Dedicated LG TV app manifest and deliverable `.ipk` package.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs lg-webos
node scripts/generate-app-icons.mjs lg-webos
node scripts/verify-release-assets.mjs lg-webos
npm install -g @webos-tools/cli@3.2.6
ares-config --profile tv
mkdir -p platforms/lg-webos/outputs
ares-package --no-minify -o platforms/lg-webos/outputs platforms/lg-webos/staging
```

**CI artifact:** `iptv-lg-webos-ipk`. The required 80×80 and 130×130 PNG icons are generated deterministically; brand artwork must be approved before store submission. Installation, remote focus, CORS and hardware codecs still require real-device QA.

**Shared experience:** the LG webOS package uses the same design and catalogue as the [web player](../../docs/WEB_HOSTING.md). The independent IPK still needs real-device video/remote testing and platform approval.
