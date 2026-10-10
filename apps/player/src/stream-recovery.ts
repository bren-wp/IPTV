import type { Stream } from './catalog';

/** Select the next untried safe stream, without looping endlessly between broken URLs. */
export function nextStreamIndex(streams: readonly Stream[], currentIndex: number, tried: ReadonlySet<string>): number | null {
  if (!streams.length || currentIndex < 0 || currentIndex >= streams.length) return null;
  for (let offset = 1; offset < streams.length; offset++) {
    const index = (currentIndex + offset) % streams.length;
    const candidate = streams[index];
    if (candidate && !tried.has(candidate.url) && !candidate.requiresHeaders) return index;
  }
  return null;
}

export function shouldRecoverHls(type: string, alreadyRecovered: boolean): boolean {
  return !alreadyRecovered && (type === 'networkError' || type === 'mediaError');
}
