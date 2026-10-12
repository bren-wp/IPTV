import test from 'node:test';
import assert from 'node:assert/strict';
import { safePublicHlsUrl, safePublicHttpsUrl } from '../public-playlist-url.mjs';

test('exports normalized public HTTPS HLS URLs with safe query strings', () => {
  assert.equal(safePublicHlsUrl('https://tv.example.org/live/playlist.M3U8?token=abc'),
    'https://tv.example.org/live/playlist.M3U8?token=abc');
  assert.equal(safePublicHlsUrl('http://tv.example.org/live/playlist.m3u8'), null);
  assert.equal(safePublicHlsUrl('https://tv.example.org/video.mp4'), null);
});

test('rejects M3U injection, embedded credentials and unsafe schemes', () => {
  for (const value of [
    'https://tv.example.org/ok.m3u8\n#EXTINF:-1,Injected',
    'https://tv.example.org/ok.m3u8\r#EXTM3U',
    'https://tv.example.org/ok.m3u8\tbad',
    'https://user:pass@tv.example.org/a.m3u8',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/plain,test',
    'https://tv.example.org/space here.m3u8',
  ]) assert.equal(safePublicHlsUrl(value), null, value);
});

test('rejects loopback, LAN, reserved and IPv4-mapped IPv6 destinations', () => {
  for (const host of [
    'localhost', 'router.local', 'admin.lan', 'api.internal',
    '127.0.0.1', '127.1', '10.0.0.2', '172.16.3.4',
    '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '192.0.2.1', '198.51.100.1', '203.0.113.5',
    '[::1]', '[fc00::1]', '[fe80::2]', '[::ffff:127.0.0.1]',
  ]) assert.equal(safePublicHlsUrl('https://' + host + '/index.m3u8'), null, host);
});

test('allows HTTPS artwork but never credentials or local artwork URLs', () => {
  assert.equal(safePublicHttpsUrl('https://cdn.example.org/art/logo.png'),
    'https://cdn.example.org/art/logo.png');
  assert.equal(safePublicHttpsUrl('https://localhost/logo.png'), null);
  assert.equal(safePublicHttpsUrl('https://user@cdn.example.org/logo.png'), null);
});
