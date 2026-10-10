# Samsung Tizen TV

Separate Tizen web widget directory with TV-profile `config.xml` and a built web bundle.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs samsung-tizen
```

Generated directory: `platforms/samsung-tizen/staging/`.
CI artifact: `iptv-samsung-tizen-staging` (unsigned staging **not** a `.wgt`).

To create a deployable `.wgt`, use Samsung Tizen Studio and valid certificate profiles, then verify remote focus, compatible codecs, stream access and device/OS version support on actual TVs. A TV app icon and store marketing assets must be provided before submission.
