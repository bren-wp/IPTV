/** External public channel metadata provides links, not broadcast rights. */
export const SOURCE = 'https://iptv-org.github.io/api';
export const CACHE_PATH = './catalog.json';

export interface Stream {
  url: string;
  title: string;
  quality: string | null;
  labels: string[];
  requiresHeaders: boolean;
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

/** Never load script:, file:, data: or embedded credentials from a contributed URL. */
export function safeMediaUrl(value: unknown): string | null {
  const valueString = str(value);
  if (!valueString) return null;
  try {
    const u = new URL(valueString);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return null;
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
      requiresHeaders: Boolean(str(raw.referrer ?? raw.http_referrer) || str(raw.user_agent))
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

/** The app can refresh without a new release; generated same-origin snapshot remains a fallback. */
export async function loadCatalog(signal?: AbortSignal): Promise<{ catalog: Catalog; isFallback: boolean }> {
  const fetchJson = async (path: string): Promise<unknown> => {
    const timeout = AbortSignal.timeout(20_000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await fetch(path, { signal: combined, cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog request failed (' + response.status + ').');
    return response.json();
  };
  try {
    const [channels, streams, logos, guides] = await Promise.all([
      fetchJson(SOURCE + '/channels.json'), fetchJson(SOURCE + '/streams.json'),
      fetchJson(SOURCE + '/logos.json'),
      fetchJson(SOURCE + '/guides.json').catch(() => [])
    ]);
    const catalog = buildCatalog(channels, streams, logos, guides);
    if (catalog.channels.length === 0) throw new Error('No channels were returned.');
    catalog.updatedAt = new Date().toISOString();
    return { catalog, isFallback: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    const fallback = await fetchJson(CACHE_PATH);
    if (!isCatalog(fallback) || fallback.channels.length === 0) throw error;
    return { catalog: fallback, isFallback: true };
  }
}
