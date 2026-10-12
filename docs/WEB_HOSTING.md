# Public web app and channel directory API

The IPTV web app is built from the same UI and playback code as Android, iOS, Windows, Android TV, Samsung Tizen and LG webOS. It can be delivered via GitHub Pages or any HTTPS static hosting provider **without a private database, custom server or PHP**.

## Public URL structure

Once GitHub Pages is enabled, the default site address is expected to be:

- `https://bren-wp.github.io/IPTV/` — full responsive web app.
- `https://bren-wp.github.io/IPTV/catalog.json` — versioned directory snapshot.
- `https://bren-wp.github.io/IPTV/api/catalog.json` — identical public JSON feed for integrations.
- `https://bren-wp.github.io/IPTV/api/status.json` — last-deployed snapshot timestamp and channel count, **not** a stream availability guarantee.

When the GitHub Pages custom domain is correctly configured, for example `iptv.icode.com.hr`, the equivalent app and feeds will be located at `https://iptv.icode.com.hr/`, `/catalog.json`, `/api/catalog.json` and `/api/status.json`.

**Do not present either URL as live before completing the GitHub Pages settings, DNS, TLS and public HTTP checks.** The example custom domain must be controlled by the publisher.

## Deploy with GitHub Pages

1. Open the repository **Settings → Pages**, select **Source: GitHub Actions**. GitHub Pages may require owner approval/permissions for Actions deployment.
2. Run **Actions → IPTV Public Web Deployment → Run workflow** on the `main` branch. Check that the actual deployment job succeeds.
3. If using a custom domain, first verify domain ownership and enter the custom domain under **Settings → Pages → Custom domain**; save it before pointing DNS. When deploying from GitHub Actions, a `CNAME` file in the artifact is ignored, so domain routing must be configured in Pages settings.
4. At your DNS provider, create a **CNAME** record: host `iptv` (for the example `iptv.icode.com.hr`), target `bren-wp.github.io`. Do not point the record at `bren-wp.github.io/IPTV` or to an invented IP address. Remove incompatible existing DNS records for that exact host.
5. After DNS propagation and certificate issuance, enable **Enforce HTTPS** in Pages settings. GitHub notes that certificate issuance and DNS changes can take time.
6. Confirm in a browser and via HTTP requests that the homepage and each JSON path returns status 200 and valid JSON. Test desktop, Android/iOS browsers and TV browsers, including real channel playback.

The independent workflow `.github/workflows/deploy-web.yml` rebuilds on relevant application changes and attempts another deployment every hour **after** the scheduled catalog sync. The latter's commits may not trigger other workflows when pushed using the default GitHub Actions token, so the schedule is intentional. GitHub schedules are best effort: they do not guarantee exact minute updates or third-party stream uptime.

## Other hosting providers

You can publish the contents of `apps/player/dist/` or CI's web ZIP to any standard HTTPS host at its document root. Run `node scripts/prepare-web-public.mjs` after building to create the read-only `api/` endpoints. Ensure JSON MIME type `application/json`, HTTPS and short cache age for `catalog.json` and `api/*.json` (e.g. 5–15 minutes), and long immutable caching for hashed JS/CSS assets. Avoid redirecting JSON API paths to the HTML app.

GitHub Pages does not support custom per-path cache headers, so consumers should send cache-busting/no-cache requests when fresh channel metadata is required. The web app also refreshes its directory from independent public sources and maintains a validated offline cache.

## Content and operational restrictions

A public playlist directory is not a media hosting or rebroadcasting service. External stream URLs can disappear, become inaccessible, require authentication, block CORS or be restricted geographically. Only publish sources you have reviewed for lawful redistribution and relevant broadcaster rights. No attempts to circumvent DRM or access controls.
