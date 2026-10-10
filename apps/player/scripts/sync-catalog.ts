import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { buildCatalog, isCatalog, SOURCE } from '../src/catalog.ts';
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
  const catalog = buildCatalog(channels, streams, logos, guides ?? []);
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
