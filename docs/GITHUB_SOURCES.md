# External GitHub sources and license review

This is a technical maintainer document, **not** a customer-facing brand page.

## Playback libraries

- [video-dev/hls.js](https://github.com/video-dev/hls.js) — Apache-2.0, used as the established browser HLS engine under its published license. Preserve the package's third-party legal notices when distributing the compiled player.
- [xbmc/inputstream.adaptive](https://github.com/xbmc/inputstream.adaptive) — a well-established Kodi playback implementation using GPL-2.0 terms. It is a useful architecture reference, **not copied, bundled or linked** into this project. Any future reuse requires checking GPL obligations and platform compatibility.

## Channel directories

- The existing publicly exposed TV channel metadata feeds are the primary source.
- The optional [Free-TV/IPTV](https://github.com/Free-TV/IPTV) GitHub M3U playlist is represented by a disabled provider record in `apps/player/playlist-sources.json`. Its project says it targets free channels, but at review time it did **not** publish an explicit root LICENSE file. The availability of a stream URL and a repository description do not establish rights to redistribute it in a commercial application.
- Do **not** enable or distribute additional streams without recording source terms, a licensing/content-rights assessment, and any broadcaster/territory restrictions. No bypassing paywalls, DRM, subscriber credentials or geographic checks.
- Only public HTTPS GitHub M3U sources are accepted by the optional server-side adapter, and only `tvg-id` references that match an already known, eligible channel are eligible.
- The adapter strips unsupported URL types, rejects local/private stream endpoints and duplicates, caps the number of entries, and isolates optional-provider failures from the primary directory.
- To onboard a verified GitHub source, add a reviewed provider record, set `enabled: true` **only after** permission verification, and run `npm --prefix apps/player run sync:catalog` to generate a fresh snapshot on the GitHub runner.
- Source contributions are tagged `github:<provider-id>` in technical catalog data. The client refresh preserves only these validated extras from the generated same-origin snapshot.

## Refresh and availability

The scheduled GitHub workflow attempts primary directory updates hourly (GitHub's scheduler is best-effort; executions can be delayed). While the application is running and online, it checks remote channel metadata around every 15 minutes and on foreground/reconnect events. A validated IndexedDB cache survives restarts to provide the most recently known channels when the upstream feed fails.

**No upstream catalog, playlist or third-party server can guarantee 100% uptime.** Channel health must be judged by actual provider delivery, codecs, browser CORS, device support and rights.

## Contributions from other projects

Only integrate open-source dependencies after checking the specific project's license, dependency security, binary redistribution requirements and maintenance status. Avoid copying unrelated application source, UI assets, logos, app-store badges or artwork without permission.
