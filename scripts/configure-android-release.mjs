import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
if (!['android', 'android-tv'].includes(target)) {
  console.error('Usage: node scripts/configure-android-release.mjs android|android-tv');
  process.exit(2);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'platforms', target, 'android/app/build.gradle');
let source = await readFile(path, 'utf8');
const codeMatch = source.match(/versionCode\s+\d+/);
const nameMatch = source.match(/versionName\s+["'][^"']+["']/);
if (!codeMatch || !nameMatch) throw new Error('Could not locate generated Android app version settings.');
source = source.replace(/versionCode\s+\d+/, 'versionCode 300');
source = source.replace(/versionName\s+["'][^"']+["']/, 'versionName "0.3.0"');
await writeFile(path, source);
console.log('Configured ' + target + ' version 0.3.0 (versionCode 300).');
