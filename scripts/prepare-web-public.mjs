import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { safePublicHlsUrl, safePublicHttpsUrl } from './public-playlist-url.mjs';

const root = resolve('apps/player/dist');
const snapshotPath = join(root, 'catalog.json');
const indexPath = join(root, 'index.html');
const apiDir = join(root, 'api');
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
if (snapshot.version !== 1 || !Array.isArray(snapshot.channels) ||
    snapshot.channels.length === 0 ||
    snapshot.channels.some(ch => typeof ch.id !== 'string' ||
      !Array.isArray(ch.streams) || ch.streams.length === 0)) {
  throw new Error('Refusing to publish a malformed or empty channel snapshot.');
}
if (!(await readFile(indexPath, 'utf8')).includes('IPTV')) {
  throw new Error('The public web player is missing its branded entry point.');
}
await mkdir(apiDir, { recursive: true });
await copyFile(snapshotPath, join(apiDir, 'catalog.json'));

// A safe playlist export of *already publicly listed* channels. Prefer HTTPS
// HLS sources without special headers, which have a better chance of playing
// on an HTTPS website. Never insert arbitrary M3U directives from metadata.
const field = (value, max=150) => typeof value === 'string'
  ? value.replace(/[\r\n\t"<>]/g, ' ').trim().slice(0, max) : '';
const lines = ['#EXTM3U'];
let exported = 0;
for (const channel of snapshot.channels) {
  const stream = channel.streams
    .map(s => ({ url: safePublicHlsUrl(s.url), requiresHeaders: s.requiresHeaders }))
    .find(s => s.url && !s.requiresHeaders);
  if (!stream) continue;
  const id = field(channel.id, 180);
  const name = field(channel.name || channel.id);
  if (!id || !name) continue;
  const category = field(Array.isArray(channel.categories) ? channel.categories[0] : '');
  const logo = field(safePublicHttpsUrl(channel.logo), 500);
  lines.push(`#EXTINF:-1 tvg-id="${id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${category}",${name}`);
  lines.push(stream.url);
  exported++;
}
if (exported === 0) throw new Error('Refusing to publish an empty public M3U playlist.');
const m3u = lines.join('\n') + '\n';
await writeFile(join(root, 'playlist.m3u'), m3u, 'utf8');
await writeFile(join(apiDir, 'playlist.m3u'), m3u, 'utf8');

// GitHub Pages and Apache shared-hosting compatibility without a custom server.
await copyFile(resolve('scripts/hosting/apache.htaccess'), join(root, '.htaccess'));
await writeFile(join(root, '.nojekyll'), '', 'utf8');

const status = {
  version: 1,
  status: 'ok',
  channelCount: snapshot.channels.length,
  playlistChannelCount: exported,
  snapshotUpdatedAt: snapshot.updatedAt ?? null,
  generatedAt: new Date().toISOString(),
  guaranteedStreams: false
};
await writeFile(join(apiDir, 'status.json'), JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log('Prepared IPTV public site:', status.channelCount, 'catalog entries;', exported, 'HTTPS HLS playlist entries.');
