import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = new Set(['android', 'ios', 'android-tv', 'lg-webos', 'samsung-tizen', 'windows']);
const requested = process.argv.slice(2);
if (!requested.length || requested.some(target => !allowed.has(target))) {
  console.error('Usage: node scripts/prepare-platform.mjs android ios android-tv lg-webos samsung-tizen windows');
  process.exit(2);
}
const source = join(root, 'apps/player/dist');
try { await access(join(source, 'index.html')); }
catch { console.error('Build the shared app with "npm run build" from apps/player first.'); process.exit(1); }

for (const platform of requested) {
  const base = join(root, 'platforms', platform);
  const output = join(base, ['lg-webos', 'samsung-tizen'].includes(platform) ? 'staging' : 'dist');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true, force: false });
  if (platform === 'lg-webos') {
    const info = JSON.parse(await readFile(join(base, 'appinfo.json'), 'utf8'));
    if (!info.id || !info.main || !info.title || !info.version || !info.type) {
      throw new Error('LG webOS manifest is incomplete.');
    }
    await writeFile(join(output, 'appinfo.json'), JSON.stringify(info, null, 2) + '\n');
  }
  if (platform === 'samsung-tizen') {
    const manifest = await readFile(join(base, 'config.xml'), 'utf8');
    if (!manifest.includes('tizen:profile name="tv-samsung"') || !manifest.includes('index.html')) {
      throw new Error('Tizen TV manifest is incomplete.');
    }
    await writeFile(join(output, 'config.xml'), manifest);
  }
  console.log('Prepared ' + platform + ': ' + output);
}
