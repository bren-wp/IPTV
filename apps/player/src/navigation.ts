import type { Channel } from './catalog';
export type View = 'home' | 'live' | 'movies' | 'series' | 'sports' | 'news' | 'kids' | 'guide' | 'favorites' | 'settings';
export const VIEW_LABELS: Readonly<Record<View, string>> = {
  home:'Home',live:'Live TV',movies:'Movies',series:'Series',sports:'Sports',
  news:'News',kids:'Kids',guide:'TV Guide',favorites:'My List',settings:'Settings'
};
export function viewCategory(view: View): string | null {
  return ['movies', 'series', 'sports', 'news', 'kids'].includes(view) ? view : null;
}
export function channelsForView(channels: Channel[], view: View, favorites: ReadonlySet<string>): Channel[] {
  if (view === 'favorites') return channels.filter(ch => favorites.has(ch.id));
  if (view === 'guide') return channels.filter(ch => (ch.guides?.length ?? 0) > 0);
  const category = viewCategory(view);
  return category ? channels.filter(ch => ch.categories.includes(category)) : channels;
}
export function recommendedChannels(channels: Channel[], country: string, max = 12): Channel[] {
  const matching = channels.filter(ch => ch.country === country);
  const others = channels.filter(ch => ch.country !== country);
  return [...matching, ...others].slice(0, Math.max(0, max));
}
export function formatChannelCount(count: number): string {
  return new Intl.NumberFormat('en').format(count);
}
