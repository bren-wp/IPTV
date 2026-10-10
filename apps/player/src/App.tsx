import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Channel, Catalog } from './catalog';
import { filterChannels, loadCatalog } from './catalog';
import Player from './Player';
import EpgGuide from './EpgGuide';

const REFRESH_MS = 60 * 60 * 1000;
const PAGE_SIZE = 120;
const FAVORITES_KEY = 'iptv:favorites:v1';

function savedFavorites(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
  } catch { return new Set(); }
}

function countryName(code: string): string {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code; }
  catch { return code; }
}

function useRemoteNavigation() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active.matches('input, textarea, select, video') ||
        active.closest('.video-frame')) return;
      const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)';
      const items = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      const origin = active.getBoundingClientRect();
      if (!origin.width) return;
      const ox = origin.left + origin.width / 2;
      const oy = origin.top + origin.height / 2;
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const positive = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      let nearest: HTMLElement | null = null;
      let score = Number.POSITIVE_INFINITY;
      for (const item of items) {
        if (item === active) continue;
        const r = item.getBoundingClientRect();
        const dx = r.left + r.width / 2 - ox;
        const dy = r.top + r.height / 2 - oy;
        const primary = horizontal ? dx : dy;
        const secondary = horizontal ? dy : dx;
        if ((positive ? primary < 4 : primary > -4)) continue;
        const candidate = Math.abs(primary) + 2 * Math.abs(secondary);
        if (candidate < score) { score = candidate; nearest = item; }
      }
      if (nearest) { event.preventDefault(); nearest.focus(); nearest.scrollIntoView({ block: 'nearest' }); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  useRemoteNavigation();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(savedFavorites);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streamIndex, setStreamIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [page, setPage] = useState(1);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const result = await loadCatalog(signal);
      if (signal?.aborted) return;
      setCatalog(result.catalog);
      setIsFallback(result.isFallback);
      setError('');
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Unable to load the channel catalog.');
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(controller.signal);
    }, REFRESH_MS);
    return () => { controller.abort(); clearInterval(interval); };
  }, [refresh]);

  const channels = catalog?.channels ?? [];
  const countries = useMemo(() => [...new Set(channels.map(ch => ch.country))]
    .sort((a, b) => countryName(a).localeCompare(countryName(b), 'en')), [channels]);
  const categories = useMemo(() => [...new Set(channels.flatMap(ch => ch.categories))].sort(), [channels]);
  const filtered = useMemo(() => filterChannels(channels, query, country, category, favorites, favoritesOnly),
    [channels, query, country, category, favorites, favoritesOnly]);
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const selected = channels.find(ch => ch.id === selectedId) ?? null;
  const stream = selected?.streams[streamIndex] ?? null;
  const favoritesCount = channels.filter(ch => favorites.has(ch.id)).length;

  useEffect(() => { setPage(1); }, [query, country, category, favoritesOnly]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch { /* Storage may be disabled. */ }
      return next;
    });
  };
  const selectChannel = (channel: Channel) => {
    setSelectedId(channel.id);
    setStreamIndex(0);
    setGuideOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon" aria-hidden="true">▶</div><span>IPTV<span className="brand-accent">.</span></span></div>
        <div className="topbar-right">
          <span className="status"><span className={error ? 'status-dot status-error' : 'status-dot'} />{refreshing ? 'SYNCING' : error ? 'CATALOG ERROR' : 'LIVE CATALOG'}</span>
          <span className="topbar-count">{channels.length.toLocaleString()} channels</span>
          <button className="icon-button" type="button" disabled={refreshing} onClick={() => void refresh()} title="Refresh channels" aria-label="Refresh channels">↻</button>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar" aria-label="Navigation">
          <div className="sidebar-label">DISCOVER</div>
          <button type="button" className={!favoritesOnly ? 'nav-item active' : 'nav-item'} onClick={() => setFavoritesOnly(false)}>
            <span aria-hidden="true">▦</span> All channels
          </button>
          <button type="button" className={favoritesOnly ? 'nav-item active' : 'nav-item'} onClick={() => setFavoritesOnly(true)}>
            <span aria-hidden="true">♡</span> Favorites <small>{favoritesCount}</small>
          </button>
          <div className="sidebar-footer">Live television, thoughtfully organized. Stream availability varies by broadcaster, device and region.</div>
        </aside>

        <div className="main-content">
          <section className="intro">
            <div><p className="eyebrow">LIVE TELEVISION · WORLDWIDE</p><h1>Discover live TV<span className="headline-period">.</span></h1>
              <p className="intro-description">Explore free-to-access public channel links from around the world. One place to find what's on.</p></div>
            <div className="hero-decoration" aria-hidden="true">◉</div>
          </section>

          {selected && stream && (
            <section className="now-playing" aria-label="Now playing">
              <div className="section-heading"><div><p className="eyebrow">NOW WATCHING</p><h2>{selected.name}</h2></div>
                <button className="text-button" type="button" onClick={() => { setSelectedId(null); setGuideOpen(false); }}>Close player ✕</button></div>
              <Player key={selected.id + ':' + streamIndex} stream={stream} channelName={selected.name}
                onNextStream={() => setStreamIndex(i => (i + 1) % selected.streams.length)}
                hasNextStream={selected.streams.length > 1} />
              <div className="player-toolbar">
                <span>{countryName(selected.country)} {selected.categories.length ? '· ' + selected.categories.join(', ') : ''}</span>
                <div className="player-actions">
                  <button className="text-button" type="button" aria-expanded={guideOpen} onClick={() => setGuideOpen(open => !open)}>
                    {guideOpen ? 'Hide TV guide' : 'TV guide'} {selected.guides?.length ? '(' + selected.guides.length + ')' : ''}
                  </button>
                  <button className="text-button" type="button" aria-pressed={favorites.has(selected.id)} onClick={() => toggleFavorite(selected.id)}>
                    {favorites.has(selected.id) ? '♥ Favorited' : '♡ Add to favorites'}
                  </button>
                  {selected.streams.length > 1 && (
                    <label className="stream-picker">Stream
                      <select value={streamIndex} onChange={e => setStreamIndex(Number(e.target.value))}>
                        {selected.streams.map((s, i) =>
                          <option key={s.url} value={i}>{s.quality ?? 'Source'} {i + 1} — {s.title}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {guideOpen && <EpgGuide key={selected.id} channel={selected} />}
            </section>
          )}

          <section className="catalog-section" aria-label="Channel catalog">
            <div className="section-heading">
              <div><p className="eyebrow">CHANNEL DIRECTORY</p><h2>{favoritesOnly ? 'Your favorites' : 'Explore channels'} <span className="muted-count">{filtered.length.toLocaleString()}</span></h2></div>
              {catalog?.updatedAt && <span className="catalog-time">{isFallback ? 'Saved catalog' : 'Last loaded'} · {new Date(catalog.updatedAt).toLocaleString()}</span>}
            </div>
            <div className="filters">
              <label className="search-box"><span aria-hidden="true">⌕</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search channels..." aria-label="Search channels" /></label>
              <label className="select-wrap"><span className="sr-only">Country</span>
                <select value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="ALL">All countries</option>
                  {countries.map(c => <option key={c} value={c}>{countryName(c)}</option>)}
                </select></label>
              <label className="select-wrap"><span className="sr-only">Category</span>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="ALL">All categories</option>
                  {categories.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                </select></label>
              <button type="button" className="button button-secondary" onClick={() => { setQuery(''); setCountry('ALL'); setCategory('ALL'); }}>Reset</button>
            </div>

            {error && <div className="message message-error" role="alert">{error} {catalog && 'Showing previously loaded channels.'}</div>}
            {isFallback && <div className="message" role="status">Live updates are unavailable. Showing the last synchronized catalog.</div>}
            {loading && <div className="message" role="status">Loading the channel catalog…</div>}
            {!loading && filtered.length === 0 && <div className="empty-state"><span aria-hidden="true">⌕</span><h3>No channels found</h3><p>Try another search, country or category.</p></div>}

            <div className="channel-grid">
              {visible.map(channel => (
                <article key={channel.id} className={selectedId === channel.id ? 'channel-card selected' : 'channel-card'}>
                  <button className="channel-main" type="button" onClick={() => selectChannel(channel)} aria-label={'Watch ' + channel.name}>
                    <div className="channel-logo">{channel.logo ? <img loading="lazy" src={channel.logo} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <span aria-hidden="true">▣</span>}</div>
                    <span className="channel-name" title={channel.name}>{channel.name}</span>
                    <span className="channel-country">{countryName(channel.country)} · {channel.streams.length} {channel.streams.length === 1 ? 'source' : 'sources'}</span>
                    <span className="watch-hint">▶ Watch live</span>
                  </button>
                  <button className={favorites.has(channel.id) ? 'favorite-button favorited' : 'favorite-button'} type="button"
                    aria-label={(favorites.has(channel.id) ? 'Remove ' : 'Add ') + channel.name + (favorites.has(channel.id) ? ' from favorites' : ' to favorites')}
                    aria-pressed={favorites.has(channel.id)} onClick={() => toggleFavorite(channel.id)}>
                    {favorites.has(channel.id) ? '♥' : '♡'}
                  </button>
                </article>
              ))}
            </div>
            {visible.length < filtered.length && (
              <div className="pagination"><button className="button button-primary" type="button" onClick={() => setPage(p => p + 1)}>
                Show more channels ({(filtered.length - visible.length).toLocaleString()} remaining) ↓
              </button></div>
            )}
          </section>
          <footer className="footer">IPTV is an independent public-link directory player. No streams are hosted by this application. A public URL does not guarantee permission, geographic availability, or continuous playback.</footer>
        </div>
      </main>
    </div>
  );
}
