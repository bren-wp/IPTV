import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

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
const status = {
  version: 1,
  status: 'ok',
  channelCount: snapshot.channels.length,
  snapshotUpdatedAt: snapshot.updatedAt ?? null,
  generatedAt: new Date().toISOString(),
  // Availability is not promised: listed streams are hosted by independent providers.
  guaranteedStreams: false
};
await writeFile(join(apiDir, 'status.json'), JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log('Prepared IPTV web directory endpoints for', status.channelCount, 'channels.');
