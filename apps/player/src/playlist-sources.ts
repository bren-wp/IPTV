import { safeMediaUrl } from './catalog';

export interface PlaylistProvider {
  id: string;
  url: string;
  enabled: boolean;
  description: string;
}
export interface AdditionalStream {
  channel: string;
  url: string;
  title: string;
  quality: null;
}
const SUPPORTED_MEDIA = /\.(?:m3u8|mp4|ts)$/i;
const MAX_PLAYLIST_CHARS = 6_000_000;
const MAX_ITEMS = 12_000;

export function validProvider(provider: unknown): provider is PlaylistProvider {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) return false;
  const item = provider as Record<string, unknown>;
  if (typeof item.id !== 'string' || !/^[a-z0-9-]{2,60}$/.test(item.id) ||
      typeof item.description !== 'string' || typeof item.enabled !== 'boolean' ||
      typeof item.url !== 'string') return false;
  try {
    const parsed = new URL(item.url);
    // Only public version-controlled HTTPS raw GitHub resources are eligible.
    return parsed.protocol === 'https:' &&
      (parsed.hostname === 'raw.githubusercontent.com' || parsed.hostname === 'github.com') &&
      !parsed.username && !parsed.password &&
      /\.(?:m3u|m3u8)$/i.test(parsed.pathname) &&
      !parsed.pathname.includes('..');
  } catch { return false; }
}

/**
 * Conservative M3U8 parser: no HTTP header directives, cookies or JavaScript.
 * Only TVG IDs already present in the reviewed canonical catalog can be joined.
 * Other entries are ignored instead of inventing channels or proxying content.
 */
export function parseAdditionalPlaylist(input: string, allowedChannelIds: ReadonlySet<string>): AdditionalStream[] {
  if (input.length > MAX_PLAYLIST_CHARS || !/^\s*#EXTM3U(?:\s|$)/.test(input)) {
    throw new Error('Invalid or oversized M3U directory.');
  }
  const streams: AdditionalStream[] = [];
  const seen = new Set<string>();
  let channel: string | null = null;
  let title = '';
  for (const raw of input.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      channel = /\btvg-id="([^"]{1,180})"/.exec(line)?.[1]?.trim() ?? null;
      title = line.slice(line.lastIndexOf(',') + 1).trim().slice(0, 120);
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    const url = safeMediaUrl(line);
    if (channel && allowedChannelIds.has(channel) && url &&
        SUPPORTED_MEDIA.test(new URL(url).pathname) && streams.length < MAX_ITEMS) {
      const key = channel + '\0' + url;
      if (!seen.has(key)) {
        streams.push({ channel, url, title: title || channel, quality: null });
        seen.add(key);
      }
    }
    channel = null;
  }
  return streams;
}
