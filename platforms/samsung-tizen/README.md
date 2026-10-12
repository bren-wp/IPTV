# Samsung Tizen Smart TV

Dedicated Tizen TV widget, manifest, and generated 117×117 app icon.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs samsung-tizen
node scripts/generate-app-icons.mjs samsung-tizen
node scripts/verify-release-assets.mjs samsung-tizen
```

**CI artifact:** `iptv-samsung-tizen-staging` (not a signed WGT). The protected signed build requires Tizen Studio and a valid Samsung TV certificate profile on a dedicated runner. Physical TV installation, decoder compatibility and store approvals are still required.

**Shared experience:** the Samsung TV staging build includes the same catalogue, player design and keyboard/remote interactions as [the web player](../../docs/WEB_HOSTING.md), but TV signing and installation on real Samsung devices are separate QA gates.
