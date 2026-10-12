import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Channel, Catalog } from './catalog';
import { filterChannels, loadCachedCatalog, loadCatalog } from './catalog';
import { newestCatalog, readStoredCatalog, saveStoredCatalog } from './catalog-storage';
import { channelsForView, formatChannelCount, recommendedChannels, VIEW_LABELS } from './navigation';
import type { View } from './navigation';
import Player from './Player';
import { channelFromQuery, channelLink } from './deep-link';
import { nextStreamIndex } from './stream-recovery';
import EpgGuide from './EpgGuide';

const REFRESH_MS = 15 * 60 * 1000; // Check for new playlist metadata each quarter-hour.
const PAGE_SIZE = 48;
const FAVORITES_KEY = 'iptv:favorites:v1';
const RECENT_KEY = 'iptv:recent:v1';
const REGION_KEY = 'iptv:region:v1';
const AUTOSYNC_KEY = 'iptv:auto-sync:v1';
type IconName = 'home'|'tv'|'film'|'series'|'sports'|'news'|'kids'|'guide'|'heart'|'settings'|'search'|'refresh'|'play'|'close'|'arrow'|'globe'|'check'|'volume'|'info'|'list';
const paths: Record<IconName,string> = {
  home:'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  tv:'M3 6h18v13H3z M9 3l3 3 3-3 M8 22h8',
  film:'M3 3h18v18H3z M8 3v18 M16 3v18 M3 8h5 M16 8h5 M3 16h5 M16 16h5',
  series:'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h4',
  sports:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 7l-4 3 1.5 4.5h5L16 10z M9.5 14.5l-3 3 M14.5 14.5l3 3',
  news:'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  kids:'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z M9 10h.01 M15 10h.01 M8 15q4 4 8 0',
  guide:'M4 5h16v16H4z M7 3v4 M17 3v4 M4 10h16 M8 14h3 M14 14h3 M8 18h3',
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  settings:'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  search:'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M17 17l5 5',
  refresh:'M20 11a8 8 0 0 0-14-5L4 8 M4 3v5h5 M4 13a8 8 0 0 0 14 5l2-2 M15 16h5v5',
  play:'M7 4l13 8-13 8z',
  close:'M5 5l14 14 M19 5 5 19',
  arrow:'M4 12h16 M14 6l6 6-6 6',
  globe:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2c-5 5-5 15 0 20 M12 2c5 5 5 15 0 20',
  check:'M4 12l5 5L20 6',volume:'M4 9h4l5-4v14l-5-4H4z M17 9q4 3 0 6',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7v.5',
  list:'M4 5h16 M4 12h16 M4 19h16'
};
function Icon({name,size=20}: {name:IconName;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
const PRIMARY_VIEWS: View[] = ['home','live','movies','series','sports','news'];
const SIDE_VIEWS: View[] = ['home','live','guide','movies','series','sports','kids','news','favorites','settings'];
const viewIcons: Record<View,IconName> = {home:'home',live:'tv',movies:'film',series:'series',sports:'sports',news:'news',kids:'kids',guide:'guide',favorites:'heart',settings:'settings'};

function fromStorage(key:string, fallback:string):string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function savedIds(key:string):string[] {
  try {
    const parsed:unknown = JSON.parse(fromStorage(key,'[]'));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0,100) : [];
  } catch { return []; }
}
function persist(key:string,value:string):void {
  try { localStorage.setItem(key,value); } catch { /* Private browsing may disable storage. */ }
}
function countryName(code:string):string {
  try { return new Intl.DisplayNames(['en'],{type:'region'}).of(code) ?? code; } catch { return code; }
}
function useRemoteNavigation(onBack:()=>void):void {
  useEffect(()=>{
    function keyDown(event:KeyboardEvent):void {
      const active = document.activeElement;
      const editable = active instanceof HTMLElement && active.matches('input,textarea,select,[contenteditable="true"]');
      if ((event.key==='Escape'||event.key==='Backspace'||event.key==='BrowserBack')&&!editable){
        event.preventDefault();onBack();return;
      }
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)||editable) return;
      if(active instanceof HTMLElement && (active.matches('video')||active.closest('.video-frame'))) return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)')).filter(el=>{
        const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
      });
      if(!(active instanceof HTMLElement)||!controls.includes(active)) {controls[0]?.focus();return;}
      const rect=active.getBoundingClientRect(), ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
      const horizontal=event.key==='ArrowLeft'||event.key==='ArrowRight';
      const positive=event.key==='ArrowRight'||event.key==='ArrowDown';
      let best:HTMLElement|null=null,score=Infinity;
      for(const target of controls){
        if(target===active)continue;
        const r=target.getBoundingClientRect(),dx=r.left+r.width/2-ox,dy=r.top+r.height/2-oy;
        const primary=horizontal?dx:dy,secondary=horizontal?dy:dx;
        if(positive?primary<5:primary>-5)continue;
        const s=Math.abs(primary)+2.4*Math.abs(secondary);
        if(s<score){score=s;best=target;}
      }
      if(best){event.preventDefault();best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}
    }
    document.addEventListener('keydown',keyDown);
    return ()=>document.removeEventListener('keydown',keyDown);
  },[onBack]);
}

function ChannelCard({channel,onPlay,onFavorite,isFavorite,isSelected}:{
  channel:Channel;onPlay:(ch:Channel)=>void;onFavorite:(id:string)=>void;isFavorite:boolean;isSelected:boolean;
}){
  const quality=channel.streams[0]?.quality?.toUpperCase();
  return <article className={'media-card'+(isSelected?' is-selected':'')}>
    <button type="button" className="media-card-main" onClick={()=>onPlay(channel)} aria-label={'Watch '+channel.name}>
      <span className="media-art">
        <span className="media-art-pattern" aria-hidden="true"/>
        <span className="media-logo">
          <span className="media-monogram">{channel.name.slice(0,2).toUpperCase()}</span>
          {channel.logo && <img src={channel.logo} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}
        </span>
        <span className="media-play"><Icon name="play" size={26}/></span>
        <span className="live-chip"><span className="live-pin"/>LIVE TV</span>
        {quality && <span className="quality-chip">{quality}</span>}
      </span>
      <span className="media-information"><strong title={channel.name}>{channel.name}</strong>
        <small>{countryName(channel.country)} · {channel.categories.length?channel.categories[0]:'Live channel'}</small></span>
    </button>
    <button type="button" className={'media-favorite'+(isFavorite?' is-favorite':'')} aria-label={(isFavorite?'Remove ':'Add ')+channel.name+(isFavorite?' from favorites':' to favorites')} aria-pressed={isFavorite} onClick={()=>onFavorite(channel.id)}><Icon name="heart" size={17}/></button>
  </article>;
}

export default function App(){
  const [view,setView]=useState<View>('home');
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [fallback,setFallback]=useState(false);
  const [query,setQuery]=useState('');
  const [country,setCountry]=useState('ALL');
  const [category,setCategory]=useState('ALL');
  const [favorites,setFavorites]=useState<Set<string>>(()=>new Set(savedIds(FAVORITES_KEY)));
  const [recent,setRecent]=useState<string[]>(()=>savedIds(RECENT_KEY));
  const [preferredCountry,setPreferredCountry]=useState(()=>fromStorage(REGION_KEY,'HR'));
  const [autoSync,setAutoSync]=useState(()=>fromStorage(AUTOSYNC_KEY,'true')!=='false');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [streamIndex,setStreamIndex]=useState(0);
  const [guideOpen,setGuideOpen]=useState(false);
  const [page,setPage]=useState(1);
  const playerRef=useRef<HTMLElement|null>(null);
  const deepLinkHandledRef=useRef(false);
  const [shareMessage,setShareMessage]=useState('');
  const failedStreamUrlsRef=useRef<Set<string>>(new Set());
  const inFlightRef=useRef(false);
  const lastAttemptRef=useRef(0);

  const refresh=useCallback(async(signal?:AbortSignal)=>{
    if(inFlightRef.current || signal?.aborted)return;
    inFlightRef.current=true;
    lastAttemptRef.current=Date.now();
    setRefreshing(true);
    try {
      const result=await loadCatalog(signal);
      if(signal?.aborted)return;
      // Never overwrite a newer in-memory result with an older bundled fallback.
      setCatalog(previous=>result.isFallback?newestCatalog(previous,result.catalog):result.catalog);
      setFallback(result.isFallback);
      setError('');
      // Remote hourly snapshots are also verified: retain them across app restarts.
      void saveStoredCatalog(result.catalog);
    } catch(e) {
      if(signal?.aborted)return;
      setError(e instanceof Error?e.message:'Channel directory is temporarily unavailable.');
    } finally {
      inFlightRef.current=false;
      if(!signal?.aborted){setLoading(false);setRefreshing(false);}
    }
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    void(async()=>{
      try {
        const [bundled,stored]=await Promise.all([
          loadCachedCatalog(controller.signal), readStoredCatalog()
        ]);
        const cached=newestCatalog(bundled,stored);
        if(cached&&!controller.signal.aborted){
          setCatalog(cached);setFallback(true);setLoading(false);
        }
      }catch{/* Network access may be cancelled when navigating away. */}
      if(!controller.signal.aborted)await refresh(controller.signal);
    })();
    // Visibility, network reconnection and a low-cost timer complement the
    // server-side hourly sync. Offline and hidden apps do not hammer hosts.
    const check=()=>{
      if(controller.signal.aborted||!autoSync||document.visibilityState!=='visible'||
         navigator.onLine===false||Date.now()-lastAttemptRef.current<REFRESH_MS)return;
      void refresh(controller.signal);
    };
    const timer=window.setInterval(check,60_000);
    document.addEventListener('visibilitychange',check);
    window.addEventListener('online',check);
    window.addEventListener('focus',check);
    return ()=>{
      controller.abort();window.clearInterval(timer);
      document.removeEventListener('visibilitychange',check);
      window.removeEventListener('online',check);
      window.removeEventListener('focus',check);
    };
  },[refresh,autoSync]);

  const channels=catalog?.channels??[];
  const byId=useMemo(()=>new Map(channels.map(ch=>[ch.id,ch])),[channels]);
  const selected=selectedId?byId.get(selectedId)??null:null;
  const stream=selected?.streams[streamIndex]??null;
  const countries=useMemo(()=>[...new Set(channels.map(ch=>ch.country))].sort((a,b)=>countryName(a).localeCompare(countryName(b),'en')),[channels]);
  const categories=useMemo(()=>[...new Set(channels.flatMap(ch=>ch.categories))].sort(),[channels]);
  const viewChannels=useMemo(()=>channelsForView(channels,view,favorites),[channels,view,favorites]);
  const filtered=useMemo(()=>filterChannels(viewChannels,query,country,category,favorites,false),[viewChannels,query,country,category,favorites]);
  const featured=useMemo(()=>recommendedChannels(channels,preferredCountry,12),[channels,preferredCountry]);
  const local=useMemo(()=>channels.filter(ch=>ch.country===preferredCountry).slice(0,12),[channels,preferredCountry]);
  const recentChannels=useMemo(()=>recent.map(id=>byId.get(id)).filter((ch):ch is Channel=>Boolean(ch)).slice(0,12),[recent,byId]);
  const favoritesCount=channels.filter(ch=>favorites.has(ch.id)).length;
  const visible=filtered.slice(0,PAGE_SIZE*page);

  useEffect(()=>setPage(1),[query,country,category,view]);
  // Keep the URL-based entry point portable: only resolve IDs that are present
  // in the validated directory; never accept an arbitrary stream URL from query.
  useEffect(()=>{
    if(deepLinkHandledRef.current || channels.length === 0) return;
    const requested=channelFromQuery(window.location.search);
    if(!requested) { deepLinkHandledRef.current=true; return; }
    const match=byId.get(requested);
    if(!match) return; // An hourly catalog refresh may still add this channel.
    deepLinkHandledRef.current=true;
    failedStreamUrlsRef.current=new Set();
    setSelectedId(match.id);setStreamIndex(0);setView('live');
  },[byId,channels.length]);
  useEffect(()=>{if(selectedId&&stream)playerRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[selectedId,stream]);
  const back=useCallback(()=>{if(selectedId){setSelectedId(null);setGuideOpen(false);}else setView('home');},[selectedId]);
  useRemoteNavigation(back);

  function switchView(next:View):void {
    setView(next);setQuery('');setCountry('ALL');setCategory('ALL');
    setSelectedId(null);setGuideOpen(false);setPage(1);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function playChannel(ch:Channel,showGuide=false):void {
    setShareMessage('');
    failedStreamUrlsRef.current=new Set();
    setSelectedId(ch.id);setStreamIndex(0);setGuideOpen(showGuide);
    setRecent(old=>{
      const next=[ch.id,...old.filter(id=>id!==ch.id)].slice(0,24);
      persist(RECENT_KEY,JSON.stringify(next));return next;
    });
  }
  async function copyChannelLink():Promise<void> {
    if(!selected || typeof navigator.clipboard?.writeText !== 'function') {
      setShareMessage('Clipboard unavailable'); return;
    }
    try {
      await navigator.clipboard.writeText(channelLink(window.location.href,selected.id));
      setShareMessage('Link copied');
    } catch { setShareMessage('Could not copy link'); }
  }
  function autoNextStream():boolean {
    if(!selected||!stream)return false;
    failedStreamUrlsRef.current.add(stream.url);
    const next=nextStreamIndex(selected.streams,streamIndex,failedStreamUrlsRef.current);
    if(next===null)return false;
    setStreamIndex(next);
    return true;
  }
  function manuallySelectStream(next:number):void {
    failedStreamUrlsRef.current=new Set();
    setStreamIndex(next);
  }
  function toggleFavorite(id:string):void {
    setFavorites(old=>{
      const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);
      persist(FAVORITES_KEY,JSON.stringify([...next]));return next;
    });
  }
  function setRegion(value:string):void {
    setPreferredCountry(value);persist(REGION_KEY,value);
  }
  function toggleAutoSync():void {
    setAutoSync(old=>{persist(AUTOSYNC_KEY,String(!old));return !old;});
  }
  function renderCards(list:Channel[],limit?:number){
    return <div className="channel-grid">{(limit?list.slice(0,limit):list).map(ch=>
      <ChannelCard key={ch.id} channel={ch} onPlay={playChannel} onFavorite={toggleFavorite} isFavorite={favorites.has(ch.id)} isSelected={selectedId===ch.id}/>)}</div>;
  }
  function shelf(title:string,subtitle:string,list:Channel[],target:View){
    if(!list.length)return null;
    return <section className="content-shelf"><div className="shelf-header">
      <div><span className="kicker">{subtitle}</span><h2>{title}</h2></div>
      <button className="link-action" type="button" onClick={()=>switchView(target)}>View all <Icon name="arrow" size={16}/></button>
    </div>{renderCards(list,8)}</section>;
  }
  const title=view==='favorites'?'My List':view==='guide'?'TV Guide':view==='live'?'Live channels':VIEW_LABELS[view];

  return <div className="app-shell">
    <header className="topbar">
      <button type="button" className="brand" onClick={()=>switchView('home')} aria-label="IPTV home">
        <img src="./brand-symbol.svg" alt="" className="brand-symbol"/><span>IPTV</span>
      </button>
      <nav className="top-links" aria-label="Primary">
        {PRIMARY_VIEWS.map(item=><button key={item} type="button" className={'top-link'+(view===item?' is-active':'')} aria-current={view===item?'page':undefined} onClick={()=>switchView(item)}>{VIEW_LABELS[item]}</button>)}
      </nav>
      <div className="top-actions">
        <span className="catalog-status"><span className={'status-light'+(error?' is-error':'')}/>{refreshing?'SYNCING':error?'OFFLINE':'LIVE DIRECTORY'}</span>
        <button type="button" className="round-action" disabled={refreshing} aria-label="Refresh channels" title="Refresh channels" onClick={()=>void refresh()}><Icon name="refresh"/></button>
        <button type="button" className="round-action" aria-label="Open settings" title="Settings" onClick={()=>switchView('settings')}><Icon name="settings"/></button>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar" aria-label="Sidebar">
        <span className="nav-caption">DISCOVER</span>
        <nav className="side-nav" aria-label="All sections">
          {SIDE_VIEWS.map(item=><button key={item} type="button" className={'side-link'+(view===item?' is-active':'')} aria-current={view===item?'page':undefined} onClick={()=>switchView(item)}>
            <Icon name={viewIcons[item]}/><span>{VIEW_LABELS[item]}</span>{item==='favorites'&&<small>{favoritesCount}</small>}
          </button>)}
        </nav>
        <div className="side-bottom"><img src="./brand-symbol.svg" alt="" width="26" height="26"/><span>One app.<br/><strong>Every screen.</strong></span></div>
      </aside>
      <main className="content" id="main-content">
        {selected&&stream&&<section className="player-panel" ref={playerRef} aria-label="Now watching">
          <div className="player-heading"><div><span className="kicker">NOW WATCHING</span><h2>{selected.name}</h2></div>
            <button className="outline-button" type="button" onClick={()=>{setSelectedId(null);setGuideOpen(false);}}><Icon name="close" size={16}/> Close</button></div>
          <Player stream={stream} key={selected.id+':'+streamIndex} channelName={selected.name}
            hasNextStream={selected.streams.length>1}
            onAutoNext={autoNextStream}
            onNextStream={()=>manuallySelectStream((streamIndex+1)%selected.streams.length)}/>
          <div className="player-options">
            <span>{countryName(selected.country)} · {selected.categories.join(', ')||'Live TV'}</span>
            <div className="player-options-actions">
              <button type="button" className="outline-button" aria-expanded={guideOpen} onClick={()=>setGuideOpen(o=>!o)}><Icon name="guide" size={16}/>{guideOpen?'Hide schedule':'TV guide'}</button>
              <button type="button" className="outline-button" aria-pressed={favorites.has(selected.id)} onClick={()=>toggleFavorite(selected.id)}><Icon name="heart" size={16}/>{favorites.has(selected.id)?'Saved':'Add to My List'}</button>
              {(window.location.protocol==='https:' || window.location.protocol==='http:') &&
                <button type="button" className="outline-button" onClick={()=>void copyChannelLink()}>
                  <Icon name="arrow" size={16}/>{shareMessage || 'Copy channel link'}
                </button>}
              {selected.streams.length>1&&<label className="source-select">Source <select value={streamIndex} onChange={e=>manuallySelectStream(Number(e.target.value))}>{selected.streams.map((s,i)=><option key={s.url} value={i}>{s.quality??'Stream'} {i+1} · {s.title}</option>)}</select></label>}
            </div>
          </div>
          {guideOpen&&<EpgGuide channel={selected}/>}
        </section>}
        {view==='home'&&<>
          <section className="hero">
            <div className="hero-planet" aria-hidden="true"/><div className="hero-stars" aria-hidden="true"/>
            <div className="hero-copy"><span className="kicker hero-kicker"><span className="live-pin"/>WELCOME TO IPTV</span>
              <h1>Live TV,<br/><span>beautifully organized.</span></h1>
              <p>Your favorite channels, news and sports in one place. Discover what is available around the world.</p>
              <div className="hero-buttons"><button type="button" className="primary-button" onClick={()=>featured[0]?playChannel(featured[0]):switchView('live')}><Icon name="play" size={18}/>Watch Live</button>
                <button type="button" className="glass-button" onClick={()=>switchView('live')}>Explore channels <Icon name="arrow" size={18}/></button></div>
              <div className="hero-meta"><span><Icon name="tv" size={17}/> {formatChannelCount(channels.length)} channels</span><span><Icon name="globe" size={17}/> Worldwide directory</span></div>
            </div>
            <div className="hero-brand" aria-hidden="true"><img src="./brand-symbol.svg" alt=""/></div>
          </section>
          <section className="category-section" aria-label="Categories"><div className="shelf-header"><div><span className="kicker">EXPLORE MORE</span><h2>Browse categories</h2></div></div>
            <div className="category-tiles">{(['live','movies','series','sports','news','kids'] as View[]).map(item=><button type="button" className="category-tile" key={item} onClick={()=>switchView(item)}><Icon name={viewIcons[item]} size={24}/><span>{VIEW_LABELS[item]}</span><Icon name="arrow" size={16}/></button>)}</div>
          </section>
          {shelf('Featured channels','WATCH NOW',featured,'live')}
          {recentChannels.length>0&&shelf('Recently watched','PICK UP WHERE YOU LEFT OFF',recentChannels,'live')}
          {local.length>0&&shelf('From '+countryName(preferredCountry),'YOUR REGION',local,'live')}
          {shelf('Sports channels','SPORTS & LIVE EVENTS',channelsForView(channels,'sports',favorites),'sports')}
          {shelf('Latest news channels','STAY INFORMED',channelsForView(channels,'news',favorites),'news')}
          {loading&&!channels.length&&<div className="loading-state" role="status"><span className="loading-spinner"/>Loading the channel directory…</div>}
        </>}
        {view!=='home'&&view!=='settings'&&<>
          <section className="page-heading">
            <span className="kicker">IPTV · ONE APP. EVERY SCREEN.</span>
            <div className="page-title-line"><div><h1>{title}<span className="headline-dot">.</span></h1>
              <p>{view==='guide'?'Choose a channel to see its available programme schedule.':
                view==='favorites'?'Channels you saved to your personal list.':
                view==='live'?'Discover live broadcasts by channel and region.':
                'Explore live television channels in this category.'}</p></div>
              <span className="count-pill">{formatChannelCount(viewChannels.length)} channels</span>
            </div>
          </section>
          {view==='guide'&&<div className="guide-info"><Icon name="info" size={21}/><p>Programme schedules are provided by external TV guide services. Select a channel to load its available XMLTV guide; availability varies by broadcaster.</p></div>}
          <div className="filter-row">
            <label className="search-field"><Icon name="search"/><input type="search" aria-label="Search channels" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search channels…"/></label>
            <label className="select-box"><span className="sr-only">Country</span><Icon name="globe" size={17}/><select value={country} onChange={e=>setCountry(e.target.value)}><option value="ALL">All countries</option>{countries.map(c=><option key={c} value={c}>{countryName(c)}</option>)}</select></label>
            <label className="select-box"><span className="sr-only">Category</span><Icon name="list" size={17}/><select value={category} onChange={e=>setCategory(e.target.value)}><option value="ALL">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
            <button type="button" className="outline-button" onClick={()=>{setQuery('');setCountry('ALL');setCategory('ALL');}}>Reset</button>
          </div>
          {!loading&&filtered.length===0&&<div className="empty-state"><Icon name={view==='favorites'?'heart':'search'} size={43}/><h2>{view==='favorites'?'No favorites saved':'No channels found'}</h2><p>{view==='favorites'?'Find channels you like and add them to My List.':'Try changing the category, country or search query.'}</p><button className="primary-button" type="button" onClick={()=>switchView('live')}>Explore Live TV <Icon name="arrow" size={17}/></button></div>}
          <section aria-label={title} className="content-shelf listing">
            {view==='guide'&&filtered.length>0&&<p className="guide-hint">Select a channel to open its current and upcoming programmes.</p>}
            <div className="channel-grid">{visible.map(ch=><ChannelCard key={ch.id} channel={ch} onPlay={item=>playChannel(item,view==='guide')} onFavorite={toggleFavorite} isFavorite={favorites.has(ch.id)} isSelected={selectedId===ch.id}/>)}</div>
            {visible.length<filtered.length&&<div className="load-more"><button type="button" className="outline-button" onClick={()=>setPage(p=>p+1)}>Load more ({formatChannelCount(filtered.length-visible.length)} remaining) <Icon name="arrow" size={17}/></button></div>}
          </section>
        </>}
        {view==='settings'&&<section className="settings-page"><span className="kicker">MAKE IT YOURS</span><h1>Settings<span className="headline-dot">.</span></h1>
          <p>Personalize your directory and playback discovery. These preferences stay on this device.</p>
          <div className="settings-card"><div><h2>Preferred region</h2><p>Show channels from this country first on Home.</p></div>
            <select aria-label="Preferred region" value={preferredCountry} onChange={e=>setRegion(e.target.value)}>{[...new Set([preferredCountry,...countries])].map(c=><option key={c} value={c}>{countryName(c)}</option>)}</select></div>
          <div className="settings-card"><div><h2>Automatic channel refresh</h2><p>Check for playlist updates approximately every 15 minutes while online and the app is visible.</p></div>
            <button type="button" role="switch" aria-checked={autoSync} onClick={toggleAutoSync} className={'toggle-switch'+(autoSync?' enabled':'')} aria-label="Automatic channel refresh"><span/></button></div>
          <div className="settings-card"><div><h2>Update channel directory</h2><p>{catalog?.updatedAt?'Last loaded: '+new Date(catalog.updatedAt).toLocaleString():'No catalog loaded yet.'}</p></div>
            <button type="button" className="outline-button" onClick={()=>void refresh()} disabled={refreshing}><Icon name="refresh" size={17}/>{refreshing?'Refreshing':'Refresh now'}</button></div>
          <div className="privacy-note"><Icon name="info"/><p>Favorites and recently watched channels are stored only on this device. Playback connects directly to independent third-party streaming hosts. Channel availability, EPG, geographic access and codec support vary.</p></div>
        </section>}
        {error&&<div role="alert" className="alert-error"><Icon name="info" size={20}/><div><strong>Live updates unavailable</strong><p>{error}{catalog?' Showing the last available directory.':''}</p></div><button type="button" className="outline-button" onClick={()=>void refresh()} disabled={refreshing}>Retry</button></div>}
        {fallback&&catalog&&!error&&<p className="cache-note" role="status">The live source is temporarily unavailable. Showing the most recent verified channel directory; retry to check for updates.</p>}
        {loading&&!channels.length&&view!=='home'&&<div className="loading-state" role="status"><span className="loading-spinner"/>Loading channels…</div>}
        <footer className="footer"><img src="./brand-symbol.svg" alt="" width="27" height="27"/><span>IPTV · One App. Every Screen.</span><span className="footer-legal">Channel streams and guide data are provided by external services and may be restricted or unavailable.</span></footer>
      </main>
    </div>
    <nav className="mobile-bottom" aria-label="Mobile navigation">{(['home','live','guide','favorites','settings'] as View[]).map(item=><button key={item} type="button" aria-current={view===item?'page':undefined} onClick={()=>switchView(item)} className={view===item?'is-active':''}><Icon name={viewIcons[item]} size={21}/><span>{VIEW_LABELS[item]}</span></button>)}</nav>
  </div>;
}
