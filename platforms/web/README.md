# Web

Separate browser distribution of the shared player.

```bash
cd apps/player && npm install && npm run build && cd ../..
node scripts/prepare-platform.mjs web
```

Generated directory: `platforms/web/dist/`.
CI artifact: `iptv-web`.

Host the contents over HTTPS, configure CDN caching so `catalog.json` updates propagate, and set up appropriate CSP and MIME types for JavaScript and JSON. Stream playback is limited by browser CORS, mixed-content policies and supported codecs.

## Public domain deployment

The [IPTV Public Web Deployment](../../.github/workflows/deploy-web.yml) GitHub Actions workflow packages this same web player on push to `main`, hourly after the channel sync, or manually. The workflow also exposes `catalog.json`, `api/catalog.json` and `api/status.json` as read-only same-origin URLs. Configure repository Pages and DNS before declaring any hostname active.

[Read the custom domain and HTTPS setup guide](../../docs/WEB_HOSTING.md).
