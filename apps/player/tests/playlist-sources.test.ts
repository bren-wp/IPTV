import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdditionalPlaylist, validProvider } from '../src/playlist-sources.ts';

test('parse known channel IDs and reject unsafe or incompatible URLs', () => {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="News.hr" group-title="News",News
https://tv.example.org/live.m3u8?token=abc
#EXTINF:-1 tvg-id="Unknown.hr",Mystery
https://unverified.example.org/play.m3u8
#EXTINF:-1 tvg-id="News.hr",Private
http://192.168.0.1/secret.m3u8
#EXTINF:-1 tvg-id="News.hr",Unplayable
https://www.twitch.tv/user
#EXTINF:-1 tvg-id="News.hr",News duplicate
https://tv.example.org/live.m3u8?token=abc
`;
  const entries = parseAdditionalPlaylist(m3u,new Set(['News.hr']));
  assert.equal(entries.length,1);
  assert.equal(entries[0].channel,'News.hr');
  assert.equal(entries[0].title,'News');
});
test('rejects arbitrary GitHub requests and invalid lists', () => {
  assert.equal(validProvider({id:'test',url:'http://raw.githubusercontent.com/o/r/main/a.m3u8',description:'X',enabled:true}),false);
  assert.equal(validProvider({id:'test',url:'https://raw.githubusercontent.com/o/r/main/a.m3u8',description:'X',enabled:false}),true);
  assert.equal(validProvider({id:'test',url:'https://evil.example.org/a.m3u8',description:'X',enabled:true}),false);
  assert.throws(()=>parseAdditionalPlaylist('not an m3u',new Set()));
  assert.throws(()=>parseAdditionalPlaylist('#EXTM3U\n'+'x'.repeat(6_000_001),new Set()));
});
