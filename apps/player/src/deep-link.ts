/** Shareable links expose channel identifiers only; no stream tokens or viewing history. */
export function channelFromQuery(search: string): string | null {
  const raw = new URLSearchParams(search).get('channel');
  if (!raw || raw.length > 180 || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

export function channelLink(page: string, id: string): string {
  if (!id || id.length > 180 || /[\u0000-\u001f\u007f]/.test(id)) {
    throw new Error('Invalid channel identifier.');
  }
  const url = new URL(page);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Channel sharing requires a public web URL.');
  }
  url.searchParams.set('channel', id);
  url.hash = '';
  return url.href;
}
