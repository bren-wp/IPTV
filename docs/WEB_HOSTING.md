# IPTV public website — domain, deployment and public playlists

The premium IPTV interface is one shared cross-platform application. The same web build can be served from GitHub Pages, a regular Apache/cPanel or DirectAdmin hosting account, or any HTTPS static server. **No PHP, WordPress, custom database or streaming proxy is required.**

## Routes and downloadable feeds

After the chosen hosting and HTTPS domain are configured, these paths become available:

| Route | Response |
| --- | --- |
| `/` | Branded, responsive live-TV application |
| `/?channel=<encoded-id>` | Direct link to a known live channel |
| `/catalog.json` | Validated channel JSON snapshot |
| `/api/catalog.json` | Same channel JSON snapshot for integrations |
| `/playlist.m3u` | M3U index of listed HTTPS HLS sources not requiring custom headers |
| `/api/playlist.m3u` | Same M3U index under the API namespace |
| `/api/status.json` | Snapshot timestamp, generation time, number of channels and exportable streams |

The public M3U is **generated from the last successfully verified channel snapshot**. It does not host media, provide credentials, bypass DRM or guarantee that each stream is licensed, compatible or reachable.

The planned example domain is `https://iptv.icode.com.hr`. The exact hostname cannot be described as active until the owner has configured its DNS, hosting root and a valid HTTPS certificate, and the public endpoints return successful responses.

## Option A: Upload a ready-to-use ZIP to your own hosting

The web ZIP contains actual production web files directly at the ZIP root: `index.html`, `assets/`, `brand-symbol.svg`, `catalog.json`, `playlist.m3u`, `api/`, `.htaccess` and `.nojekyll`.

1. Create a subdomain named `iptv.icode.com.hr` in your hosting control panel, and note its **exact document root**.
2. Configure DNS per your hosting provider's real instructions: an `A` record pointing to your server's assigned IP or a provider-specified CNAME. Do **not** use the GitHub Pages CNAME unless choosing Option B below.
3. Upload the ZIP and extract its **contents, not a containing folder**, into that document root. Example: `<document-root>/index.html`, `<document-root>/assets/`, `<document-root>/api/`.
4. Ensure all hidden files, including `.htaccess`, are extracted. Apache uses the included rules for JSON/M3U MIME types, public CORS on directory feeds and short cache lifetimes.
5. Enable HTTPS in the hosting panel (trusted certificate for the exact subdomain). Test the homepage, links to channels, public feeds, mobile interface and several real devices.
6. If the server is not Apache, translate the MIME/CORS/cache rules to its configuration instead of assuming that `.htaccess` works.

The browser updates its visible channel directory regularly, but files published as static `catalog.json` and `playlist.m3u` **do not change after a manual ZIP upload**. For automatic updates, use Option C or Option B.

[Detailed Croatian upload instructions](POSTAVLJANJE-WEB-HR.md).

## Option B: GitHub Pages (no separate paid web host required)

1. In this repository go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Run **Actions → IPTV Public Web Deployment**, using the `main` branch.
3. After deployment succeeds, GitHub Pages can serve the app at `https://bren-wp.github.io/IPTV/`, but confirm accessibility before announcing it.
4. To use `iptv.icode.com.hr`, first follow GitHub's domain ownership verification. Configure the custom domain in GitHub Pages settings.
5. Add a DNS **CNAME** named `iptv` at your `icode.com.hr` zone, targeting **`bren-wp.github.io`**. Do not append `/IPTV` to the DNS target. Remove conflicting DNS records for this exact host.
6. After DNS propagation, enable **Enforce HTTPS**, wait for the certificate, and test the actual public URL.

The workflow rebuilds on relevant code changes and *attempts* to deploy a refreshed verified catalogue every hour after the catalogue synchronization. This timing is best effort: GitHub Actions scheduled workflows can be delayed. A GitHub Pages site does not use the Apache `.htaccess` settings; the platform controls HTTP headers.

## Option C: Automatic refresh on your own server over SSH

The workflow `.github/workflows/deploy-shared-hosting.yml` redeploys the latest verified web assets and M3U/JSON endpoints hourly after the directory sync, and on relevant code pushes. It only runs when explicitly enabled.

Configure the following **GitHub repository Actions variable** (or organization variable) under **Settings → Secrets and variables → Actions → Variables**:

- `IPTV_SSH_DEPLOY_ENABLED` = `true`.

Then set these **encrypted Actions secrets** for the same repository:

| Secret | Purpose |
| --- | --- |
| `IPTV_SSH_HOST` | Real host name of your SSH/SFTP provider |
| `IPTV_SSH_USER` | Restricted SSH user with access only to the intended web root |
| `IPTV_SSH_PRIVATE_KEY` | Private key for the dedicated deployment account |
| `IPTV_SSH_KNOWN_HOSTS` | Independently verified host public-key line for SSH host pinning |
| `IPTV_SSH_REMOTE_DIR` | Absolute document root ending with `/`, e.g. `/home/ACCOUNT/public_html/iptv/` |

Never commit these secrets or paste private keys in chat. Provision the SSH account on your own hosting, verify its server fingerprint out-of-band and confirm its authorized destination. The workflow does **not** delete unrelated server files. If your hosting provider only supports FTP/FTPS and not SSH, this SSH workflow cannot work; use the provider's approved deployment service instead.

## Local build

```bash
cd apps/player
npm install
npm run typecheck
npm test
npm run build
cd ../..
node scripts/prepare-web-public.mjs
```

The upload-ready output is in `apps/player/dist/`. To create a ZIP, compress the **contents** of that directory, retaining hidden files. The standalone product README and marketing copy are not required inside the public web directory.

## Acceptance checklist

- Homepage returns HTTP 200 and loads branded CSS/JS assets over HTTPS.
- `catalog.json` and `api/catalog.json` return parseable JSON and contain nonempty channels.
- `playlist.m3u` and `api/playlist.m3u` begin with `#EXTM3U` and contain actual HTTPS source lines.
- `api/status.json` reports a valid timestamp and channel count.
- Copying a channel link opens a known channel, while unknown IDs never cause an arbitrary stream request.
- App navigation, favorites, TV guide states, offline directory and player fallback work on representative desktop/mobile devices.
- Every deployed stream is reviewed for broadcaster permissions and actual platform compatibility.

## Scope and limitations

This is a static website. It can publish verified metadata and URLs, but cannot guarantee provider uptime, remove CORS restrictions, bypass access controls or manage user streaming credentials. Public channel lists do not by themselves grant commercial rebroadcast rights. Signed store releases, actual device QA, rights clearance, GitHub Pages permissions, DNS and certificate management remain external release steps.
