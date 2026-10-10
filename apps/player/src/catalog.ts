/** The public iptv-org API supplies links and metadata, not streaming rights. */
export const SOURCE = 'https://iptv-org.github.io/api';
export const CACHE_PATH = './catalog.json';

export interface Stream {
  url: string;
  title: string;
  quality: string | null;
  labels: string[];
  requiresHeaders: boolean;
}
export interface Channel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  languages: string[];
  logo: string | null;
  streams: Stream[];
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

export function buildCatalog(channelsRaw: unknown, streamsRaw: unknown, logosRaw: unknown): Catalog {
  if (!Array.isArray(channelsRaw) || !Array.isArray(streamsRaw) || !Array.isArray(logosRaw)) {
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
      logo: null, streams: []
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
  const playable = [...channels.values()].filter(channel => channel.streams.length > 0);
  playable.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { version: 1, updatedAt: null, source: 'iptv-org', channels: playable };
}

export function isCatalog(value: unknown): value is Catalog {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.channels)) return false;
  return value.channels.every((ch: unknown) =>
    isRecord(ch) && typeof ch.id === 'string' && typeof ch.name === 'string' &&
    typeof ch.country === 'string' && Array.isArray(ch.categories) &&
    Array.isArray(ch.streams) && ch.streams.length > 0 &&
    ch.streams.every((s: unknown) => isRecord(s) && Boolean(safeMediaUrl(s.url)))
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
    const response = await fetch(path, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Catalog request failed (' + response.status + ').');
    return response.json();
  };
  try {
    const [channels, streams, logos] = await Promise.all([
      fetchJson(SOURCE + '/channels.json'), fetchJson(SOURCE + '/streams.json'), fetchJson(SOURCE + '/logos.json')
    ]);
    const catalog = buildCatalog(channels, streams, logos);
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
