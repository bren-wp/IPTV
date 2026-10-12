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

## Upload-ready hosting package

For a conventional cPanel/DirectAdmin/Apache hosting account, upload **the contents of the web ZIP directly into the document root for the chosen subdomain** (not the ZIP's parent folder). The package contains `index.html`, `assets/`, `catalog.json`, `playlist.m3u`, `api/`, `.htaccess`, and `.nojekyll`.

The `api/playlist.m3u` and `playlist.m3u` outputs include only HTTPS HLS entries without special request headers from the currently verified snapshot. They are metadata links, not hosted videos or proof of streaming rights.

**Important:** manually uploading a static ZIP does *not* refresh the ZIP's JSON/M3U files by itself. The player refreshes its on-screen channel directory independently, but the public `playlist.m3u` and `catalog.json` paths require redeployment. Set up the [hourly GitHub Pages workflow](../../.github/workflows/deploy-web.yml) or the [optional protected SSH hosting deployment](../../.github/workflows/deploy-shared-hosting.yml) for automatic public feed updates.

For DNS, HTTPS, troubleshooting and a complete upload checklist, read [WEB_HOSTING.md](../../docs/WEB_HOSTING.md).

**Brand and marketing:** use the established [IPTV design guide](../../docs/UI_BRAND_GUIDE.md), [marketing copy](../../docs/MARKETING.md) and [documentation index](../../docs/INDEX.md). Never claim TV stream rights, uninterrupted playback or store approvals based on the build alone.
