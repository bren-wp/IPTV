import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalog, filterChannels, isCatalog, loadCachedCatalog, safeMediaUrl, loadCatalog, retainReviewedStreams } from '../src/catalog.ts';

const metadata = [
  { id: 'Alpha.hr', name: 'Alpha TV', country: 'HR', categories: ['news'], is_nsfw: false },
  { id: 'Adult.hr', name: 'Adult', country: 'HR', is_nsfw: true },
  { id: 'Closed.hr', name: 'Closed', country: 'HR', closed: '2025-01-01' }
];
const streams = [
  { channel: 'Alpha.hr', url: 'https://example.com/live.m3u8', title: 'Alpha HD', quality: '1080p' },
  { channel: 'Alpha.hr', url: 'https://example.com/live.m3u8' },
  { channel: 'Alpha.hr', url: 'javascript:alert(1)' },
  { channel: 'Adult.hr', url: 'https://example.com/adult.m3u8' },
  { channel: 'Closed.hr', url: 'https://example.com/closed.m3u8' }
];

test('rejects dangerous links, credentials and unsupported schemes', () => {
  assert.equal(safeMediaUrl('javascript:alert(1)'), null);
  assert.equal(safeMediaUrl('ftp://example.com/live'), null);
  assert.equal(safeMediaUrl('https://user:pass@example.com/live'), null);
  assert.equal(safeMediaUrl('https://example.com/live.m3u8'), 'https://example.com/live.m3u8');
});
test('joins metadata, streams and logos, deduplicating and excluding explicit NSFW/closed entries', () => {
  const catalog = buildCatalog(metadata, streams, [
    { channel: 'Alpha.hr', url: 'https://example.com/logo.png', in_use: true }
  ]);
  assert.equal(catalog.channels.length, 1);
  assert.equal(catalog.channels[0].name, 'Alpha TV');
  assert.equal(catalog.channels[0].logo, 'https://example.com/logo.png');
  assert.equal(catalog.channels[0].streams.length, 1);
  assert.equal(catalog.channels[0].streams[0].quality, '1080p');
  assert.equal(isCatalog(catalog), true);
});
test('search and filter respect favorite, country and category', () => {
  const c = buildCatalog(metadata, streams, []).channels;
  const f = new Set(['Alpha.hr']);
  assert.equal(filterChannels(c, 'alpha', 'HR', 'news', f, true).length, 1);
  assert.equal(filterChannels(c, 'alpha', 'US', 'news', f, false).length, 0);
  assert.equal(filterChannels(c, 'alpha', 'HR', 'sports', f, false).length, 0);
  assert.equal(filterChannels(c, '', 'HR', 'ALL', new Set(), true).length, 0);
});
test('does not accept malformed upstream payloads', () => {
  assert.throws(() => buildCatalog({}, [], []));
  assert.equal(isCatalog({ version: 1, channels: [{ streams: [] }] }), false);
});

test('rejects internal, reserved and private hostnames to prevent requests into local networks', () => {
  for (const url of [
    'http://127.0.0.1/control',
    'http://localhost/',
    'https://router.local/admin',
    'https://device.internal/live',
    'http://10.0.0.5/stream',
    'http://172.31.255.3/stream',
    'http://192.168.1.1/stream',
    'http://169.254.169.254/metadata',
    'http://100.100.100.100/stream',
    'http://[::1]/stream',
    'http://[fe80::1]/stream',
    'http://[fc00::1]/stream'
  ]) {
    assert.equal(safeMediaUrl(url), null, url);
  }
  assert.equal(safeMediaUrl('https://8.8.8.8/video.m3u8'), 'https://8.8.8.8/video.m3u8');
});

test('loads only a validated nonempty bundled catalog without requiring a remote API call', async () => {
  const original = globalThis.fetch;
  try {
    const valid = buildCatalog(metadata, streams, []);
    globalThis.fetch = async (input: RequestInfo | URL) => {
      assert.equal(String(input), './catalog.json');
      return Response.json(valid);
    };
    const value = await loadCachedCatalog();
    assert.equal(value?.channels[0].id, 'Alpha.hr');

    globalThis.fetch = async () => Response.json({version: 1, updatedAt: null, channels: []});
    assert.equal(await loadCachedCatalog(), null);
  } finally {
    globalThis.fetch = original;
  }
});

test('live catalog still refreshes when newer AbortSignal helpers are unavailable on TV', async () => {
  const oldFetch = globalThis.fetch;
  const any = Object.getOwnPropertyDescriptor(AbortSignal, 'any');
  const timeout = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
  try {
    Object.defineProperty(AbortSignal, 'any', { configurable: true, value: undefined });
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
    globalThis.fetch = async (resource: RequestInfo | URL) => {
      const url = String(resource);
      const value = url.endsWith('/channels.json') ? metadata :
        url.endsWith('/streams.json') ? streams : [];
      return Response.json(value);
    };
    const result = await loadCatalog();
    assert.equal(result.catalog.channels.length, 1);
    assert.equal(result.isFallback, false);
  } finally {
    globalThis.fetch = oldFetch;
    if (any) Object.defineProperty(AbortSignal, 'any', any);
    if (timeout) Object.defineProperty(AbortSignal, 'timeout', timeout);
  }
});

test('keeps safe reviewed GitHub streams through direct refresh and drops invalid/unknown alternatives',()=>{
  const live=buildCatalog(metadata,streams,[]);
  const cached=buildCatalog(metadata,[
    {channel:'Alpha.hr',url:'https://example.com/live.m3u8'},
    {channel:'Alpha.hr',url:'https://extra.example.com/channel.m3u8',source:'github:public-github-playlist'},
    {channel:'Alpha.hr',url:'https://invalid.example.com/ignored.m3u8',source:'github:malformed source'},
    {channel:'Unknown.hr',url:'https://extra.example.com/unknown.m3u8',source:'github:public-github-playlist'}
  ],[]);
  retainReviewedStreams(live,cached);
  assert.equal(live.channels.length,1);
  assert.equal(live.channels[0].streams.length,2);
  assert.equal(live.channels[0].streams[1].source,'github:public-github-playlist');
});
