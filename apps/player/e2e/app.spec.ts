import { expect, test } from '@playwright/test';

const channels = [
  {id:'HRNews.hr',name:'Example News',country:'HR',categories:['news'],languages:['hr'],is_nsfw:false},
  {id:'HRSport.hr',name:'Example Sport',country:'HR',categories:['sports'],languages:['hr'],is_nsfw:false},
  {id:'USMovies.us',name:'Example Cinema',country:'US',categories:['movies'],languages:['en'],is_nsfw:false}
];
const streams = channels.map(channel=>({
  channel:channel.id,url:channel.id==='HRSport.hr'
    ?'https://example.test/sport-source-a.mp4':'https://example.test/'+channel.id+'/live.m3u8',
  title:channel.name,quality:'720p'
}));
streams.push({channel:'HRSport.hr',url:'https://example.test/sport-source-b.mp4',title:'Example Sport backup',quality:'720p'});
const guides = [{channel:'HRNews.hr',site:'example.test',site_id:'HRNews.hr',lang:'hr',sources:[
  {format:'XML',url:'https://example.test/programmes.xml'}
]}];
function xmlDate(value:Date):string {
  return value.toISOString().replace(/[-:TZ]/g,'').slice(0,14)+' +0000';
}
test.beforeEach(async({page})=>{
  await page.route('https://iptv-org.github.io/api/**',route=>{
    const url=route.request().url();
    const value=url.endsWith('/channels.json')?channels:url.endsWith('/streams.json')?streams:url.endsWith('/guides.json')?guides:[];
    return route.fulfill({json:value});
  });
  await page.route('**/catalog.json',route=>route.fulfill({json:{version:1,updatedAt:null,source:'test',channels:[]}}));
  await page.route('https://example.test/programmes.xml',route=>{
    const start=xmlDate(new Date(Date.now()-10*60_000));
    const stop=xmlDate(new Date(Date.now()+30*60_000));
    return route.fulfill({contentType:'application/xml',headers:{'access-control-allow-origin':'*'},body:
      '<tv><programme channel="HRNews.hr" start="'+start+'" stop="'+stop+'"><title>Example Headlines</title><desc>Trusted fixture</desc></programme></tv>'});
  });
});

test('home, live search, favorites, categories and persistent preferences work',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop navigation scenario');
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/Live TV,/})).toBeVisible();
  await expect(page.getByText('Featured channels')).toBeVisible();
  await page.getByRole('button',{name:'Live TV',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:/Live channels/})).toBeVisible();
  await page.getByRole('searchbox',{name:'Search channels'}).fill('Example Sport');
  await expect(page.getByRole('button',{name:'Watch Example Sport'})).toBeVisible();
  await page.getByRole('button',{name:'Add Example Sport to favorites'}).click();
  await page.getByRole('navigation',{name:'All sections'}).getByRole('button',{name:/My List/}).click();
  await expect(page.getByRole('button',{name:'Watch Example Sport'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Watch Example Cinema'})).toHaveCount(0);
  await page.getByRole('navigation',{name:'All sections'}).getByRole('button',{name:'Settings'}).click();
  await page.getByRole('combobox',{name:'Preferred region'}).selectOption('US');
  await page.reload();
  await page.getByRole('navigation',{name:'All sections'}).getByRole('button',{name:'Settings'}).click();
  await expect(page.getByRole('combobox',{name:'Preferred region'})).toHaveValue('US');
});

test('guide loads real XMLTV programmes and the player can be closed',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop guide scenario');
  await page.goto('/');
  await page.getByRole('navigation',{name:'All sections'}).getByRole('button',{name:'TV Guide'}).click();
  await expect(page.getByRole('button',{name:'Watch Example News'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Watch Example Cinema'})).toHaveCount(0);
  await page.getByRole('button',{name:'Watch Example News'}).click();
  await expect(page.getByRole('region',{name:'Now watching'})).toBeVisible();
  await expect(page.getByText('Example Headlines')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region',{name:'Now watching'})).toHaveCount(0);
});

test('mobile navigation, categories and empty states remain functional',async({page,isMobile})=>{
  test.skip(!isMobile,'Mobile-only viewport checks');
  await page.goto('/');
  const bottom=page.getByRole('navigation',{name:'Mobile navigation'});
  await expect(bottom).toBeVisible();
  await bottom.getByRole('button',{name:'My List'}).click();
  await expect(page.getByRole('heading',{name:/My List/})).toBeVisible();
  await expect(page.getByText('No favorites saved')).toBeVisible();
  await bottom.getByRole('button',{name:'Live TV'}).click();
  await expect(page.getByRole('button',{name:'Watch Example Sport'})).toBeVisible();
});

test('failed native stream automatically selects the next source', async ({page,isMobile}) => {
  test.skip(isMobile,'Desktop player failover scenario');
  await page.route('https://example.test/sport-source-a.mp4', route => route.abort('failed'));
  await page.route('https://example.test/sport-source-b.mp4', route =>
    route.fulfill({status:200,contentType:'video/mp4',body:''}));
  await page.goto('/');
  await page.getByRole('navigation',{name:'All sections'}).getByRole('button',{name:'Live TV'}).click();
  await page.getByRole('button',{name:'Watch Example Sport'}).click();
  await expect(page.getByRole('region',{name:'Now watching'})).toBeVisible();
  await expect(page.locator('.source-select select')).toHaveValue('1',{timeout:15000});
});
