import assert from 'node:assert/strict';
import test from 'node:test';
import { newestCatalog, readStoredCatalog, saveStoredCatalog } from '../src/catalog-storage.ts';
import { buildCatalog } from '../src/catalog.ts';

const first = buildCatalog([{ id:'News.hr',name:'News',country:'HR',categories:['news']}],
  [{ channel:'News.hr',url:'https://example.com/live.m3u8'}],[]);
const newer = {...first, updatedAt: '2026-10-11T12:00:00.000Z'};
const older = {...first, updatedAt: '2026-10-10T12:00:00.000Z'};

test('retains freshest valid snapshot and handles absent dates', () => {
  assert.equal(newestCatalog(older,newer),newer);
  assert.equal(newestCatalog(newer,older),newer);
  assert.equal(newestCatalog(null,older),older);
  assert.equal(newestCatalog(first,newer),newer);
  assert.equal(newestCatalog(newer,null),newer);
});
test('storage is optional on platforms where IndexedDB is unavailable', async () => {
  assert.equal(await readStoredCatalog(),null);
  await saveStoredCatalog(first);
});
