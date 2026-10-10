import { deflateSync } from 'node:zlib';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
const allowed = new Set(['web', 'ios', 'android', 'android-tv', 'lg-webos', 'samsung-tizen']);
if (!allowed.has(target)) {
  console.error('Usage: node scripts/generate-app-icons.mjs [web|ios|android|android-tv|lg-webos|samsung-tizen]');
  process.exit(2);
}

const crcTable = Array.from({length: 256}, (_, n) => {
  let x = n;
  for (let i = 0; i < 8; i++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
  return x >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, payload) {
  const name = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4); size.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([size, name, payload, crc]);
}
function insideRoundedRect(x, y, l, t, r, b, radius) {
  const px = Math.max(l + radius, Math.min(x, r - radius));
  const py = Math.max(t + radius, Math.min(y, b - radius));
  return (x - px) ** 2 + (y - py) ** 2 <= radius ** 2;
}
function image(size) {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  const stride = size * 4 + 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + .5) / size;
      const py = (y + .5) / size;
      let c = [12, 21, 39];
      const face = insideRoundedRect(px, py, .17, .24, .83, .72, .085);
      const bezel = insideRoundedRect(px, py, .21, .28, .79, .68, .064);
      if (face) c = [48, 113, 230];
      if (bezel) c = [27, 77, 179];
      // Play triangle with a geometry-derived edge, no font dependency.
      const tx = (px - .425) / .22;
      const ty = Math.abs(py - .48) / .20;
      if (tx >= 0 && tx <= 1 && ty <= tx) c = [251, 253, 255];
      if (insideRoundedRect(px, py, .43, .73, .57, .78, .022)) c = [102, 157, 245];
      if (insideRoundedRect(px, py, .36, .79, .64, .824, .015)) c = [102, 157, 245];
      const index = y * stride + 1 + x * 4;
      rows[index] = c[0]; rows[index + 1] = c[1]; rows[index + 2] = c[2]; rows[index + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, {level: 9})),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
async function put(path, size) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, image(size));
  const info = await stat(path);
  if (info.size < 250) throw new Error('Generated icon is unexpectedly small: ' + path);
  console.log('Generated branded ' + size + 'px icon at ' + path);
}
if (target === 'lg-webos') {
  const dir = join(root, 'platforms/lg-webos/staging');
  await put(join(dir, 'icon.png'), 80);
  await put(join(dir, 'largeicon.png'), 130);
  await put(join(dir, 'store-icon.png'), 400);
} else if (target === 'samsung-tizen') {
  await put(join(root, 'platforms/samsung-tizen/staging/icon.png'), 117);
} else if (target === 'web') {
  await put(join(root, 'platforms/web/dist/icon.png'), 192);
} else if (target === 'ios') {
  const dir = join(root, 'platforms/ios/ios/App/App/Assets.xcassets/AppIcon.appiconset');
  await put(join(dir, 'AppIcon-512@2x.png'), 1024);
} else {
  const base = join(root, 'platforms', target, 'android/app/src/main/res');
  for (const [density, size] of Object.entries({mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192})) {
    for (const file of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await put(join(base, 'mipmap-' + density, file), size);
    }
  }
}
