import test from 'node:test';
import assert from 'node:assert/strict';
import { channelFromQuery, channelLink } from '../src/deep-link.ts';

test('open a channel by a safe shareable URL parameter', () => {
  assert.equal(channelFromQuery('?channel=News.hr'), 'News.hr');
  assert.equal(channelFromQuery('?category=sports&channel=News%20EU'), 'News EU');
  assert.equal(channelFromQuery('?channel='), null);
  assert.equal(channelFromQuery('?channel='+encodeURIComponent('\u0000')),null);
  assert.equal(channelFromQuery('?channel='+ 'x'.repeat(181)),null);
});
test('links retain the web page path for default Pages and custom domains', () => {
  assert.equal(channelLink('https://bren-wp.github.io/IPTV/?q=old#player','News.hr'),
    'https://bren-wp.github.io/IPTV/?q=old&channel=News.hr');
  assert.equal(channelLink('https://iptv.icode.com.hr/','Alpha.hr'),
    'https://iptv.icode.com.hr/?channel=Alpha.hr');
  assert.throws(()=>channelLink('iptv://app/index.html','News.hr'));
});
