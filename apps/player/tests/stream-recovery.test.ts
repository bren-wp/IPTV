import assert from 'node:assert/strict';
import test from 'node:test';
import { nextStreamIndex, shouldRecoverHls } from '../src/stream-recovery.ts';
import type { Stream } from '../src/catalog.ts';

const source = (name: string, requiresHeaders = false): Stream => ({
  url: 'https://example.com/' + name + '.m3u8',
  title: name, quality: null, labels: [], requiresHeaders
});

test('moves to a playable alternative without revisiting failed URLs', () => {
  const list = [source('one'), source('two'), source('three')];
  assert.equal(nextStreamIndex(list, 0, new Set([list[0].url])), 1);
  assert.equal(nextStreamIndex(list, 1, new Set([list[0].url, list[1].url])), 2);
  assert.equal(nextStreamIndex(list, 2, new Set(list.map(s=>s.url))), null);
  assert.equal(nextStreamIndex(list, 0, new Set([list[0].url, list[1].url])), 2);
});

test('skips special-header streams and malformed source lists', () => {
  const list=[source('one'),source('two',true),source('three')];
  assert.equal(nextStreamIndex(list,0,new Set([list[0].url])),2);
  assert.equal(nextStreamIndex(list,0,new Set([list[0].url,list[2].url])),null);
  assert.equal(nextStreamIndex([],0,new Set()),null);
  assert.equal(nextStreamIndex(list,-1,new Set()),null);
});

test('HLS recovery is attempted at most once per problem category', () => {
  assert.equal(shouldRecoverHls('networkError',false),true);
  assert.equal(shouldRecoverHls('mediaError',false),true);
  assert.equal(shouldRecoverHls('networkError',true),false);
  assert.equal(shouldRecoverHls('otherError',false),false);
});
