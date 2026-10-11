/** External public channel metadata provides links, not broadcast rights. */
export const SOURCE = 'https://iptv-org.github.io/api';
export const CACHE_PATH = './catalog.json';
/** Public read-only snapshot published by this project's hourly update workflow. */
export const REMOTE_SNAPSHOT = 'https://raw.githubusercontent.com/bren-wp/IPTV/main/apps/player/public/catalog.json';

export interface Stream {
  url: string;
  title: string;
  quality: string | null;
  labels: string[];
  requiresHeaders: boolean;
  source?: string; // Additional playlist provenance; absent for primary directory.
}
export interface GuideSource {
  url: string;
  site: string;
  siteId: string;
  lang: string | null;
  format: 'XML';
}
export interface Channel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  languages: string[];
  logo: string | null;
  streams: Stream[];
  guides?: GuideSource[];
}
export interface Catalog {
  version: 1;
  updatedAt: string | null;
  source: string;
  channels: Channel[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

/**
 * Reject local/private network destinations in user-visible, third-party catalog URLs.
 * This prevents untrusted playlist entries from reaching router/admin endpoints on a viewer's LAN.
 */
export function safeMediaUrl(value: unknown): string | null {
  const valueString = str(value);
  if (!valueString) return null;
  try {
    const u = new URL(valueString);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') ||
        host.endsWith('.local') || host.endsWith('.internal') ||
        host.endsWith('.home.arpa') || host === '0' || host.endsWith('.invalid')) return null;
    if (host.startsWith('[') && host.endsWith(']')) {
      const ip = host.slice(1, -1);
      if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd') ||
          ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') ||
          ip.startsWith('feb') || ip.startsWith('::ffff:')) return null;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [first, second] = host.split('.').map(Number);
      if (first === 0 || first === 10 || first === 127 || first >= 224 ||
          (first === 100 && second >= 64 && second <= 127) ||
          (first === 169 && second === 254) ||
          (first === 172 && second >= 16 && second <= 31) ||
          (first === 192 && (second === 168 || second === 0)) ||
          (first === 198 && (second === 18 || second === 19))) return null;
    }
    return u.href;
  } catch { return null; }
}

export function buildCatalog(
  channelsRaw: unknown, streamsRaw: unknown, logosRaw: unknown, guidesRaw: unknown = []
): Catalog {
  if (!Array.isArray(channelsRaw) || !Array.isArray(streamsRaw) || !Array.isArray(logosRaw) || !Array.isArray(guidesRaw)) {
    throw new Error('The upstream IPTV catalog has an unexpected format.');
  }
  const channels = new Map<string, Channel>();
  for (const raw of channelsRaw) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id);
    if (!id || raw.is_nsfw === true || raw.closed || channels.has(id)) continue;
    channels.set(id, {
      id, name: str(raw.name) ?? id, country: str(raw.country) ?? 'XX',
      categories: strings(raw.categories), languages: strings(raw.languages),
      logo: null, streams: [], guides: []
    });
  }
  // Prefer logos that the broadcaster currently uses, without losing fallback images.
  for (const raw of logosRaw) {
    if (!isRecord(raw)) continue;
    const channel = channels.get(str(raw.channel) ?? '');
    const url = safeMediaUrl(raw.url);
    if (channel && url && (channel.logo === null || raw.in_use === true)) channel.logo = url;
  }
  const seen = new Set<string>();
  for (const raw of streamsRaw) {
    if (!isRecord(raw)) continue;
    const id = str(raw.channel);
    const url = safeMediaUrl(raw.url);
    if (!id || !url || seen.has(id + '\u0000' + url)) continue;
    const channel = channels.get(id);
    if (!channel) continue;
    seen.add(id + '\u0000' + url);
    channel.streams.push({
      url, title: str(raw.title) ?? channel.name, quality: str(raw.quality),
      labels: strings(raw.labels ?? (raw.label ? [raw.label] : [])),
      requiresHeaders: Boolean(str(raw.referrer ?? raw.http_referrer) || str(raw.user_agent)),
      ...(typeof raw.source === 'string' && /^github:[a-z0-9-]{2,60}$/.test(raw.source)
        ? { source: raw.source } : {})
    });
  }

  for (const raw of guidesRaw) {
    if (!isRecord(raw)) continue;
    const channel = channels.get(str(raw.channel) ?? '');
    if (!channel || !Array.isArray(raw.sources)) continue;
    for (const rawSource of raw.sources) {
      if (!isRecord(rawSource) || (str(rawSource.format)?.toUpperCase() !== 'XML')) continue;
      const url = safeMediaUrl(rawSource.url);
      if (!url || (channel.guides?.length ?? 0) >= 8 ||
        channel.guides?.some(guide => guide.url === url)) continue;
      channel.guides?.push({
        url,
        site: str(raw.site) ?? 'Unknown provider',
        siteId: str(raw.site_id) ?? channel.id,
        lang: str(raw.lang),
        format: 'XML'
      });
    }
  }

  // Put generally browser-compatible HTTPS HLS streams without special headers first.
  const rankStream = (s: Stream) =>
    (s.requiresHeaders ? 8 : 0) +
    (s.url.startsWith('https:') ? 0 : 2) +
    (new URL(s.url).pathname.toLowerCase().endsWith('.m3u8') ? 0 : 1);
  for (const channel of channels.values()) {
    channel.streams.sort((a, b) => rankStream(a) - rankStream(b));
  }
  const playable = [...channels.values()].filter(channel => channel.streams.length > 0);
  playable.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { version: 1, updatedAt: null, source: 'Public TV directory', channels: playable };
}

export function isCatalog(value: unknown): value is Catalog {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.channels)) return false;
  return value.channels.every((ch: unknown) =>
    isRecord(ch) && typeof ch.id === 'string' && typeof ch.name === 'string' &&
    typeof ch.country === 'string' && Array.isArray(ch.categories) &&
    Array.isArray(ch.streams) && ch.streams.length > 0 &&
    ch.streams.every((s: unknown) => isRecord(s) && Boolean(safeMediaUrl(s.url))) &&
    (!('guides' in ch) || (Array.isArray(ch.guides) && ch.guides.every((g: unknown) =>
      isRecord(g) && Boolean(safeMediaUrl(g.url)) && g.format === 'XML' &&
      typeof g.site === 'string' && typeof g.siteId === 'string')))
  );
}

/** Merge only validated, additional-source stream URLs from the last server snapshot. */
export function retainReviewedStreams(live: Catalog, snapshot: Catalog | null): Catalog {
  if (!snapshot || !isCatalog(snapshot)) return live;
  const previous = new Map(snapshot.channels.map(ch=>[ch.id,ch]));
  for (const channel of live.channels) {
    const prior = previous.get(channel.id);
    if (!prior) continue;
    const seen = new Set(channel.streams.map(stream=>stream.url));
    for (const stream of prior.streams) {
      if (!stream.source?.startsWith('github:') || !safeMediaUrl(stream.url) || seen.has(stream.url) ||
          channel.streams.length >= 16) continue;
      channel.streams.push(stream);
      seen.add(stream.url);
    }
  }
  return live;
}

export function filterChannels(
  channels: Channel[], query: string, country: string, category: string, favorites: ReadonlySet<string>,
  favoritesOnly = false
): Channel[] {
  const q = query.trim().toLocaleLowerCase();
  return channels.filter(ch =>
    (!favoritesOnly || favorites.has(ch.id)) &&
    (country === 'ALL' || ch.country === country) &&
    (category === 'ALL' || ch.categories.includes(category)) &&
    (!q || ch.name.toLocaleLowerCase().includes(q) || ch.id.toLocaleLowerCase().includes(q))
  );
}

/**
 * Select the most recently updated *validated* snapshot, while preventing a
 * transient partial sync from wiping out most of an existing channel list.
 */
export function bestSnapshot(first: unknown, second: unknown): Catalog | null {
  const valid = (value: unknown): Catalog | null =>
    isCatalog(value) && value.channels.length > 0 ? value : null;
  const a = valid(first);
  const b = valid(second);
  if (!a) return b;
  if (!b) return a;
  const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
  const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
  const tA = Number.isFinite(aTime) ? aTime : 0;
  const tB = Number.isFinite(bTime) ? bTime : 0;
  const [newest, older] = tB > tA ? [b, a] : [a, b];
  if (older.channels.length >= 100 && newest.channels.length < older.channels.length / 2) return older;
  return newest;
}

/** Load the bundled verified snapshot before accessing any external service. */
export async function loadCachedCatalog(signal?: AbortSignal): Promise<Catalog | null> {
  try {
    const response = await fetch(CACHE_PATH, { signal, cache: 'no-store' });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return isCatalog(value) && value.channels.length > 0 ? value : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

/** The app can refresh without a new release; generated same-origin snapshot remains a fallback. */
export async function loadCatalog(signal?: AbortSignal): Promise<{ catalog: Catalog; isFallback: boolean }> {
  const fetchJson = async (path: string): Promise<unknown> => {
    // AbortSignal.any/timeout are missing on several older Smart TV WebKit engines.
    const controller = new AbortController();
    const cancel = (): void => controller.abort();
    const timeout = setTimeout(cancel, 20_000);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    try {
      const response = await fetch(path, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Catalog request failed (' + response.status + ').');
      return await response.json();
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  };
  try {
    const [channels, streams, logos, guides] = await Promise.all([
      fetchJson(SOURCE + '/channels.json'), fetchJson(SOURCE + '/streams.json'),
      fetchJson(SOURCE + '/logos.json'),
      fetchJson(SOURCE + '/guides.json').catch(() => [])
    ]);
    const catalog = buildCatalog(channels, streams, logos, guides);
    if (catalog.channels.length === 0) throw new Error('No channels were returned.');
    // Prefer the hourly GitHub snapshot over the snapshot frozen into the
    // installed binary. This also retains reviewed alternative stream URLs.
    const remote = await fetchJson(REMOTE_SNAPSHOT).catch(() => null);
    const embedded = remote ? null : await fetchJson(CACHE_PATH).catch(() => null);
    retainReviewedStreams(catalog, bestSnapshot(remote, embedded));
    catalog.updatedAt = new Date().toISOString();
    return { catalog, isFallback: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    // Both fallback paths are read-only and validated. A failed GitHub
    // request must not prevent loading the bundled snapshot.
    const [remote, embedded] = await Promise.all([
      fetchJson(REMOTE_SNAPSHOT).catch(() => null),
      fetchJson(CACHE_PATH).catch(() => null)
    ]);
    if (signal?.aborted) throw error;
    const fallback = bestSnapshot(remote, embedded);
    if (!fallback) throw error;
    return { catalog: fallback, isFallback: true };
  }
}
