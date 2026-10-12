import { readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!['lg-webos', 'samsung-tizen', 'ios', 'android', 'android-tv', 'windows'].includes(target)) {
  console.error('Usage: node scripts/verify-release-assets.mjs [platform including windows]');
  process.exit(2);
}
async function png(path, expectedSize) {
  const contents = await readFile(path);
  if (contents.length < 250 || contents.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
      contents.readUInt32BE(16) !== expectedSize || contents.readUInt32BE(20) !== expectedSize) {
    throw new Error('PNG asset dimensions/signature invalid: ' + path);
  }
}
async function nonEmpty(path) {
  const size = (await stat(path)).size;
  if (size < 50) throw new Error('Required release file is missing or empty: ' + path);
}
const base = join(root, 'platforms', target);
const web = join(base, ['lg-webos', 'samsung-tizen'].includes(target) ? 'staging' : 'dist');
// Every distribution must contain its own UI bundle and offline channel index.
// No runtime dependency on a separately hosted IPTV website is permitted.
await nonEmpty(join(web, 'index.html'));
await nonEmpty(join(web, 'catalog.json'));
const page = await readFile(join(web, 'index.html'), 'utf8');
if (!page.includes('assets/') || /<script[^>]+src=["']https?:\/\//i.test(page) ||
    /<script[^>]+src=["']\/src\//i.test(page)) {
  throw new Error('A platform app is missing its locally bundled application code.');
}
if (['lg-webos', 'samsung-tizen'].includes(target)) {
  await nonEmpty(join(web, 'index.html'));
  await nonEmpty(join(web, 'catalog.json'));
}
if (target === 'lg-webos') {
  const info = JSON.parse(await readFile(join(web, 'appinfo.json'), 'utf8'));
  for (const key of ['id', 'title', 'main', 'icon', 'largeIcon', 'version']) {
    if (!info[key]) throw new Error('Missing webOS app metadata: ' + key);
  }
  if (info.version !== '0.5.4') throw new Error('webOS version mismatch.');
  await png(join(web, info.icon), 80);
  await png(join(web, info.largeIcon), 130);
}
if (target === 'samsung-tizen') {
  const xml = await readFile(join(web, 'config.xml'), 'utf8');
  if (!xml.includes('tizen:profile name="tv-samsung"') ||
      !xml.includes('<icon src="icon.png"/>') ||
      !xml.includes('version="0.5.4"')) throw new Error('Tizen TV metadata mismatch.');
  await png(join(web, 'icon.png'), 117);
}
if (target === 'windows') {
  await nonEmpty(join(web, 'index.html'));
  await nonEmpty(join(web, 'catalog.json'));
  await png(join(base, 'assets/icon.png'), 256);
  const ico = await readFile(join(base, 'assets/icon.ico'));
  if (ico.length < 250 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) !== 1 ||
      ico.readUInt32LE(18) !== 22 || ico.readUInt32LE(14) !== ico.length - 22) {
    throw new Error('Windows icon container is invalid.');
  }
}
if (target === 'ios') await png(join(base, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024);
if (target === 'android' || target === 'android-tv') {
  const gradle = await readFile(join(base, 'android/app/build.gradle'), 'utf8');
  if (!/versionCode\s+504/.test(gradle) || !/versionName\s+"0.5.4"/.test(gradle)) {
    throw new Error('Android release version has not been configured.');
  }
  await png(join(base, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png'), 48);
}
console.log('Verified release assets for ' + target + '.');
