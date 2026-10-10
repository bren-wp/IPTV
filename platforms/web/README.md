# Web

Separate browser distribution of the shared player.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs web
```

Generated directory: `platforms/web/dist/`.
CI artifact: `iptv-web`.

Host the contents over HTTPS, configure CDN caching so `catalog.json` updates propagate, and set up appropriate CSP and MIME types for JavaScript and JSON. Stream playback is limited by browser CORS, mixed-content policies and supported codecs.
