import assert from 'node:assert/strict';
import test from 'node:test';
import { channelsForView, recommendedChannels, viewCategory } from '../src/navigation.ts';
import type { Channel } from '../src/catalog.ts';
const make = (id:string,country:string,categories:string[],guides=false): Channel=>({
  id,name:id,country,categories,languages:[],logo:null,
  streams:[{url:'https://example.com/channel.m3u8',title:id,quality:null,labels:[],requiresHeaders:false}],
  guides: guides?[{url:'https://example.com/guide.xml',format:'XML',site:'test',siteId:id,lang:null}]:[]
});
const list=[make('news', 'US',['news'],true),make('movie','HR',['movies']),make('sport','HR',['sports'],true)];
test('category views match actual channel metadata, not artificial VOD entries',()=>{
 assert.equal(viewCategory('movies'),'movies');
 assert.equal(viewCategory('home'),null);
 assert.deepEqual(channelsForView(list,'movies',new Set()).map(x=>x.id),['movie']);
 assert.deepEqual(channelsForView(list,'series',new Set()),[]);
 assert.deepEqual(channelsForView(list,'guide',new Set()).map(x=>x.id),['news','sport']);
 assert.deepEqual(channelsForView(list,'favorites',new Set(['sport'])).map(x=>x.id),['sport']);
});
test('preferred region comes first without removing worldwide channels',()=>{
 assert.deepEqual(recommendedChannels(list,'HR').map(x=>x.id),['movie','sport','news']);
 assert.deepEqual(recommendedChannels(list,'HR',1).map(x=>x.id),['movie']);
});
