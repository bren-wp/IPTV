import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildCatalog, SOURCE } from '../src/catalog.ts';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../public/catalog.json');
async function fetchData(path: string): Promise<unknown> {
  const response = await fetch(SOURCE + path, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error('Upstream request failed: ' + path + ' (' + response.status + ')');
  return response.json();
}

async function main(): Promise<void> {
  const [channels, streams, logos, guides] = await Promise.all([
    fetchData('/channels.json'), fetchData('/streams.json'),
    fetchData('/logos.json'), fetchData('/guides.json').catch(error => {
      console.warn('Guide metadata unavailable; preserving a playable channel catalog:', error);
      return [];
    })
  ]);
  const catalog = buildCatalog(channels, streams, logos, guides);
  if (catalog.channels.length === 0) throw new Error('Refusing to publish an empty catalog.');
  let prior: unknown;
  try { prior = JSON.parse(await readFile(target, 'utf8')); } catch { prior = null; }
  if (prior && typeof prior === 'object' && 'channels' in prior &&
    JSON.stringify(prior.channels) === JSON.stringify(catalog.channels)) {
    console.log('Catalog unchanged; no commit needed.');
    return;
  }
  catalog.updatedAt = new Date().toISOString();
  await mkdir(dirname(target), { recursive: true });
  const temp = target + '.tmp';
  await writeFile(temp, JSON.stringify(catalog) + '\n', 'utf8');
  await rename(temp, target);
  console.log('Synchronized ' + catalog.channels.length + ' channels.');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
