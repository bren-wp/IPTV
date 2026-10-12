import { deflateSync } from 'node:zlib';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
const allowed = new Set(['ios', 'android', 'android-tv', 'lg-webos', 'samsung-tizen', 'windows']);
if (!allowed.has(target)) {
  console.error('Usage: node scripts/generate-app-icons.mjs [ios|android|android-tv|lg-webos|samsung-tizen|windows]');
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
function nearSegment(x, y, x1, y1, x2, y2, width) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx*dx + dy*dy)));
  return Math.hypot(x - (x1 + t*dx), y - (y1 + t*dy)) <= width;
}
function image(size) {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  const stride = size * 4 + 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + .5) / size;
      const py = (y + .5) / size;
      let c = [12, 21, 39];
      // Keep every Android, Apple, TV and browser icon aligned with brand-symbol.svg.
      const antennas = nearSegment(px, py, .43, .285, .32, .14, .018) ||
        nearSegment(px, py, .57, .285, .68, .14, .018) ||
        Math.hypot(px-.32, py-.14) < .032 || Math.hypot(px-.68, py-.14) < .032;
      if (antennas) c = [83, 192, 254];
      const outline = insideRoundedRect(px, py, .135, .27, .865, .83, .126);
      const inside = insideRoundedRect(px, py, .20, .34, .80, .76, .092);
      if (outline) c = [37, 123, 247];
      if (inside) c = [5, 21, 50];
      // Anti-distraction white play triangle; no character glyph or remote font.
      const tx = (px - .39) / .27;
      const ty = Math.abs(py - .55) / .20;
      if (tx >= 0 && tx <= 1 && ty <= tx) c = [248, 250, 252];
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
} else if (target === 'windows') {
  const dir = join(root, 'platforms/windows/assets');
  await put(join(dir, 'icon.png'), 256);
  // Windows ICO container with an embedded PNG image (supported by Windows 10/11).
  const pngData = image(256);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);   // Type = icon
  header.writeUInt16LE(1, 4);   // One image
  header[6] = 0; header[7] = 0; // 256 x 256
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngData.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(join(dir, 'icon.ico'), Buffer.concat([header, pngData]));
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
