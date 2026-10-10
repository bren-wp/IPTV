import type { Channel, GuideSource } from './catalog';

export interface Programme {
  title: string;
  subtitle: string | null;
  description: string | null;
  start: number;
  stop: number;
  category: string | null;
}

const MAX_XML_BYTES = 8 * 1024 * 1024;
const MAX_PROGRAMMES = 120_000;

/** XMLTV accepts YYYYMMDDhhmmss [+/-]HHMM with optional truncated time components. */
export function parseXmltvDate(value: string): number | null {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})?(\d{2})?\s*([+-])(\d{2})(\d{2})$/);
  if (!match) return null; // Time zone must be explicit: avoid local-time ambiguity.
  const [, year, month, day, hour, minute = '00', second = '00', sign, offsetHour, offsetMinute] = match;
  const nums = [year, month, day, hour, minute, second, offsetHour, offsetMinute].map(Number);
  const [y, mo, d, h, mi, s, oh, om] = nums;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59 || oh > 23 || om > 59) return null;
  const base = Date.UTC(y, mo - 1, d, h, mi, s);
  const check = new Date(base);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return base - (sign === '+' ? 1 : -1) * (oh * 60 + om) * 60_000;
}

function childText(node: Element, name: string): string | null {
  const child = [...node.children].find(c => c.localName === name);
  const value = child?.textContent?.trim();
  return value || null;
}

export function parseXmltv(xml: string, channelIds: string[], now = Date.now()): Programme[] {
  if (new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) throw new Error('The guide file is too large.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'tv') {
    throw new Error('This URL does not contain a valid XMLTV guide.');
  }
  const ids = new Set(channelIds.filter(Boolean));
  const programmes = doc.getElementsByTagName('programme');
  if (programmes.length > MAX_PROGRAMMES) throw new Error('The guide contains too many entries.');
  const from = now - 12 * 60 * 60_000;
  const until = now + 7 * 24 * 60 * 60_000;
  const selected: Programme[] = [];
  for (const node of programmes) {
    if (!ids.has(node.getAttribute('channel') ?? '')) continue;
    const start = parseXmltvDate(node.getAttribute('start') ?? '');
    const stop = parseXmltvDate(node.getAttribute('stop') ?? '');
    if (start === null || stop === null || stop <= start || stop < from || start > until) continue;
    const title = childText(node, 'title');
    if (!title) continue;
    selected.push({
      title: title.slice(0, 250),
      subtitle: childText(node, 'sub-title')?.slice(0, 250) ?? null,
      description: childText(node, 'desc')?.slice(0, 1500) ?? null,
      category: childText(node, 'category')?.slice(0, 100) ?? null,
      start, stop
    });
  }
  return selected.sort((a, b) => a.start - b.start).slice(0, 150);
}

async function limitedText(response: Response, signal: AbortSignal): Promise<string> {
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_XML_BYTES) throw new Error('The guide file is too large.');
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_XML_BYTES) throw new Error('The guide file is too large.');
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) throw new Error('Guide loading was cancelled.');
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_XML_BYTES) throw new Error('The guide file is too large.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8').decode(data);
}

export async function loadProgrammeGuide(
  channel: Channel, source: GuideSource, signal: AbortSignal
): Promise<Programme[]> {
  if (source.format !== 'XML') throw new Error('Only XMLTV guides are supported.');
  // Source URLs are validated while constructing the catalog. Browsers enforce CORS.
  const response = await fetch(source.url, { signal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('Guide download failed (HTTP ' + response.status + ').');
  const xml = await limitedText(response, signal);
  return parseXmltv(xml, [channel.id, source.siteId]);
}

export function splitProgrammeSchedule(items: Programme[], now = Date.now()): {
  current: Programme | null; next: Programme[];
} {
  const current = items.find(p => p.start <= now && now < p.stop) ?? null;
  return { current, next: items.filter(p => p.start > now).slice(0, 6) };
}
