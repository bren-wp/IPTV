import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalog, filterChannels, isCatalog, safeMediaUrl } from '../src/catalog.ts';

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
