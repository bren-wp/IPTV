# IPTV visual language and platform UX

The premium navy/electric-blue identity is shared by the **same React player** used by Android, iOS, Android TV, Tizen, LG webOS and web. Every target packages the same design tokens and SVG artwork, with separately generated launcher icons.

## Foundation

| Token | Value | Use |
| --- | --- | --- |
| Primary | `#3882F6` | Brand, actions and TV focus |
| Highlight | `#60A5FA` | Hover and accessible contrast |
| Deep blue | `#1D4ED8` | Active tabs, gradients |
| Navy | `#0B1020` | Main surfaces/background |
| Slate | `#1F2937` | UI panels |
| White | `#F8FAFC` | Primary text |

Typography: **Inter**, with a platform-system-sans fallback. The app does not require an external font server. Brand assets: `apps/player/public/brand-symbol.svg`, `brand-logo.svg`. Platform PNG icons are regenerated consistently by `scripts/generate-app-icons.mjs`.

## Design and behavior

- Home uses a cinematic orbital hero rendered in CSS (no fabricated TV content art), with blue gradient buttons, discovery tiles, curated regional/live shelves, recent channels and favorites.
- All category routes reflect **actual live channel metadata**, including Movies, Series, Sports, Kids, News. There is no invented VOD library, movie playback, download function or watch history for content that does not exist.
- TV Guide only lists channels with known EPG sources and loads real programme data on demand.
- Watch view uses the real stream player, source switching, EPG and local favorite actions; unreliable third-party stream servers may fail without control by the app.
- Mobile uses bottom navigation and two-column responsive content. Tablet/browser supports wide grids. TV and keyboard get visible focus and directional movement; native launchers are separately configured.
- Preferences for country priority and automatic refresh stay on-device. Recently watched stores channel IDs only. No account, advertising SDK or analytics are introduced.
- Errors, loading, empty results, live-update fallback and controls all have explicit states. The remote Back/Escape key closes the player or returns to Home.

## Image references vs production

Design mockups show cinematic films, fictional featured programmes and third-party service badges for illustrative presentation. The production application must not claim those shows, channels, 4K streams, user ratings or store approvals without factual underlying data and the necessary rights.

The SVG brand mark and its generated launcher counterparts can be updated through version control. Android/iOS/Tizen/webOS final appearance must be validated on hardware before promising pixel-perfect 1:1 parity due to safe-area, platform type, decoder and focus differences.

## Acceptance checks

`npm run typecheck`, `npm test`, web production build, Android APK/AAB, Android TV APK/AAB, iOS Simulator, webOS IPK, Samsung TV staging and platform artifact verification must pass on the exact PR commit. Store signing, platform approval, distribution rights and device QA remain separate release gates.
