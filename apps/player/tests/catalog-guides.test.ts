import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalog, isCatalog } from '../src/catalog.ts';

const metadata = [{ id: 'News.hr', name: 'News', country: 'HR', categories: ['news'] }];
const streams = [
  { channel: 'News.hr', url: 'http://example.test/unreliable.ts', referrer: 'https://site.test' },
  { channel: 'News.hr', url: 'https://example.test/live.m3u8' },
  { channel: 'News.hr', url: 'http://example.test/live.m3u8' }
];
const sources = [
  { channel: 'News.hr', site: 'example.test', site_id: 'news', lang: 'hr',
    sources: [
      { url: 'https://example.test/epg.xml', format: 'XML' },
      { url: 'https://example.test/epg.xml', format: 'XML' },
      { url: 'javascript:alert(1)', format: 'XML' },
      { url: 'https://example.test/xmltv.json', format: 'JSON' }
    ]
  },
  { channel: 'Unknown.hr', sources: [{ url: 'https://example.test/other.xml', format: 'XML' }] }
];

test('joins XMLTV sources, drops invalid links and duplicates, keeps matching site ID', () => {
  const catalog = buildCatalog(metadata, streams, [], sources);
  const channel = catalog.channels[0];
  assert.equal(channel.guides?.length, 1);
  assert.deepEqual(channel.guides?.[0], {
    url: 'https://example.test/epg.xml',
    site: 'example.test', siteId: 'news', lang: 'hr', format: 'XML'
  });
  assert.equal(isCatalog(catalog), true);
});

test('prioritizes HTTPS HLS streams without custom request headers', () => {
  const channel = buildCatalog(metadata, streams, []).channels[0];
  assert.equal(channel.streams[0].url, 'https://example.test/live.m3u8');
  assert.equal(channel.streams[1].url, 'http://example.test/live.m3u8');
  assert.equal(channel.streams[2].requiresHeaders, true);
});

test('rejects corrupt guide sources in fallback snapshots and invalid upstream metadata', () => {
  const catalog = buildCatalog(metadata, streams, [], sources);
  assert.equal(isCatalog({ ...catalog, channels: [{ ...catalog.channels[0], guides: [{ url: 'file:///etc/passwd', format: 'XML' }] }] }), false);
  assert.throws(() => buildCatalog(metadata, streams, [], {}));
});
