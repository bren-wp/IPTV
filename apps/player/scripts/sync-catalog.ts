import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { buildCatalog, isCatalog, SOURCE } from '../src/catalog.ts';
import { parseAdditionalPlaylist, validProvider } from '../src/playlist-sources.ts';
import type { PlaylistProvider } from '../src/playlist-sources.ts';
import type { Catalog } from '../src/catalog.ts';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../public/catalog.json');
const retries = 3;
async function fetchData(path: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(SOURCE + path, {
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Directory source returned HTTP ' + response.status + ' for ' + path);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

/**
 * Disabled-by-default additional GitHub providers must be explicitly enabled
 * only after verifying their license and stream distribution permissions.
 */
async function additionalGithubStreams(channelsRaw: unknown): Promise<Array<Record<string, unknown>>> {
  const configPath = resolve(dirname(fileURLToPath(import.meta.url)), '../playlist-sources.json');
  const config: unknown = JSON.parse(await readFile(configPath, 'utf8'));
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid provider settings.');
  const values = config as Record<string, unknown>;
  if (values.schemaVersion !== 1 || !Array.isArray(values.providers)) throw new Error('Unknown provider format.');
  const providers: PlaylistProvider[] = [];
  for (const provider of values.providers) {
    if (!validProvider(provider)) throw new Error('Untrusted GitHub playlist provider configuration.');
    providers.push(provider);
  }
  const allowedIds = new Set(
    (Array.isArray(channelsRaw) ? channelsRaw : []).flatMap((raw: unknown): string[] =>
      typeof raw === 'object' && raw !== null && 'id' in raw && typeof raw.id === 'string' &&
      !('is_nsfw' in raw && raw.is_nsfw) && !('closed' in raw && raw.closed) ? [raw.id] : [])
  );
  const streams: Array<Record<string, unknown>> = [];
  for (const provider of providers.filter(p => p.enabled)) {
    try {
      const response = await fetch(provider.url, {signal:AbortSignal.timeout(25000),cache:'no-store'});
      if (!response.ok) throw new Error('Provider returned HTTP '+response.status);
      const body = await response.text();
      const parsed = parseAdditionalPlaylist(body,allowedIds);
      streams.push(...parsed.map(entry=>({...entry,source:'github:'+provider.id})));
      console.log('Reviewed GitHub provider '+provider.id+' contributed '+parsed.length+' matching streams.');
    } catch (error) {
      console.warn('Additional playlist temporarily unavailable, keeping core directory:',provider.id,error);
    }
  }
  return streams;
}

async function main(): Promise<void> {
  let previous: Catalog | null = null;
  try {
    const contents: unknown = JSON.parse(await readFile(target, 'utf8'));
    if (isCatalog(contents) && contents.channels.length) previous = contents;
  } catch { /* First synchronization has no previous snapshot. */ }

  const [channels, streams, logos, guides] = await Promise.all([
    fetchData('/channels.json'),
    fetchData('/streams.json'),
    fetchData('/logos.json'),
    fetchData('/guides.json').catch(error => {
      console.warn('TV guide metadata unavailable; retaining last known guide sources:', error);
      return null;
    })
  ]);
  const extra = await additionalGithubStreams(channels);
  const catalog = buildCatalog(channels, Array.isArray(streams) ? [...streams, ...extra] : streams, logos, guides ?? []);
  if (catalog.channels.length === 0) throw new Error('Refusing to publish an empty directory.');

  // A severe temporary upstream outage must not replace a healthy directory.
  if (previous && previous.channels.length >= 100 &&
      catalog.channels.length < previous.channels.length / 2) {
    throw new Error('Refusing an unexpected drop of over 50% in channels. Last good snapshot is unchanged.');
  }

  if (guides === null && previous) {
    const lastGuides = new Map(previous.channels.map(ch => [ch.id, ch.guides ?? []]));
    for (const channel of catalog.channels) channel.guides = lastGuides.get(channel.id) ?? [];
  }

  if (previous && JSON.stringify(previous.channels) === JSON.stringify(catalog.channels)) {
    console.log('Catalog unchanged; previous verified snapshot remains current.');
    return;
  }
  catalog.updatedAt = new Date().toISOString();
  await mkdir(dirname(target), { recursive: true });
  const temp = target + '.tmp';
  try {
    await writeFile(temp, JSON.stringify(catalog) + '\n', 'utf8');
    await rename(temp, target);
  } catch (error) {
    console.error('Catalog was not replaced:', error);
    throw error;
  }
  console.log('Validated and synchronized ' + catalog.channels.length + ' live channels.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
