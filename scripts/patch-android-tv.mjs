import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = join(root, 'platforms/android-tv/android/app/src/main');
const manifestPath = join(project, 'AndroidManifest.xml');
let manifest = await readFile(manifestPath, 'utf8');
const android = 'http://schemas.android.com/apk/res/android';
if (!manifest.includes('<manifest') || !manifest.includes('<application')) {
  throw new Error('Expected Capacitor AndroidManifest.xml was not found.');
}
if (!manifest.includes('android.software.leanback')) {
  manifest = manifest.replace('<application', `
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <application`);
}
if (!manifest.includes('android:banner="@drawable/tv_banner"')) {
  manifest = manifest.replace('<application', '<application android:banner="@drawable/tv_banner"');
}
if (!manifest.includes('android.intent.category.LEANBACK_LAUNCHER')) {
  if (!manifest.includes('<category android:name="android.intent.category.LAUNCHER" />')) {
    throw new Error('Expected Capacitor launcher intent was not found.');
  }
  manifest = manifest.replace(
    '<category android:name="android.intent.category.LAUNCHER" />',
    '<category android:name="android.intent.category.LAUNCHER" />\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />'
  );
}
await writeFile(manifestPath, manifest);
const bannerDir = join(project, 'res/drawable');
await mkdir(bannerDir, { recursive: true });
const banner = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="${android}"
    android:width="320dp" android:height="180dp"
    android:viewportWidth="320" android:viewportHeight="180">
  <path android:fillColor="#101B32" android:pathData="M0,0h320v180h-320z"/>
  <path android:fillColor="#397FF1" android:pathData="M118,46h84v88h-84z"/>
  <path android:fillColor="#FFFFFF" android:pathData="M145,64l0,52 46,-26z"/>
</vector>
`;
await writeFile(join(bannerDir, 'tv_banner.xml'), banner);
console.log('Android TV leanback launcher and banner configured.');
