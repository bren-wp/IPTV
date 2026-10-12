import { isIP } from 'node:net';

// Applies to public website exports only. It does not replace the playback
// catalog's own URL validation or establish licensing/reachability.
export function safePublicHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > 8192 ||
      /[\u0000-\u0020\u007f]/.test(value)) return null;
  let u;
  try { u = new URL(value); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' ||
      /\.(?:localhost|local|lan|internal|home\.arpa|invalid|test)$/.test(host)) return null;
  const ipHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  const ipVersion = isIP(ipHost);
  if (ipVersion === 4) {
    const [a, b, c] = ipHost.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113)) return null;
  } else if (ipVersion === 6) {
    // Disallow mapped IPv4 and local, unique-local, link-local,
    // documentation and multicast IPv6 destinations.
    const low = ipHost.toLowerCase();
    const first = parseInt(low.split(':')[0] || '0', 16);
    if (low === '::' || low === '::1' || low.startsWith('::ffff:') ||
        (first & 0xfe00) === 0xfc00 ||
        (first & 0xffc0) === 0xfe80 ||
        (first & 0xff00) === 0xff00 ||
        low.startsWith('2001:db8:')) return null;
  } else if (!host.includes('.')) {
    return null;
  }
  return u.href;
}

export function safePublicHlsUrl(value) {
  const url = safePublicHttpsUrl(value);
  return url && new URL(url).pathname.toLowerCase().endsWith('.m3u8') ? url : null;
}
