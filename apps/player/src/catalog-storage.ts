import type { Catalog } from './catalog';
import { isCatalog } from './catalog';

const DB_NAME = 'iptv-directory-cache';
const STORE_NAME = 'snapshots';
const KEY = 'latest';
const OPEN_TIMEOUT = 5000;

/** Retain a validated last-successful directory across application restarts. */
function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    let finished = false;
    const complete = (value: IDBDatabase | null) => {
      if (finished) { value?.close(); return; }
      finished = true; clearTimeout(timer); resolve(value);
    };
    const timer = setTimeout(() => complete(null), OPEN_TIMEOUT);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => complete(request.result);
      request.onerror = () => complete(null);
      request.onblocked = () => complete(null);
    } catch { complete(null); }
  });
}
export async function readStoredCatalog(): Promise<Catalog | null> {
  const db = await openDatabase();
  if (!db) return null;
  try {
    return await new Promise(resolve => {
      let settled = false;
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const timer = setTimeout(() => {
        try { transaction.abort(); } catch { /* Already closed */ }
        done(null);
      }, OPEN_TIMEOUT);
      const done = (catalog: Catalog | null) => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(catalog); }
      };
      const request = transaction.objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => {
        const value: unknown = request.result;
        done(isCatalog(value) && value.channels.length > 0 ? value : null);
      };
      request.onerror = () => done(null);
      transaction.onabort = () => done(null);
    });
  } catch { return null; }
  finally { db.close(); }
}
export async function saveStoredCatalog(catalog: Catalog): Promise<void> {
  if (!isCatalog(catalog) || !catalog.channels.length) return;
  const db = await openDatabase();
  if (!db) return;
  try {
    await new Promise<void>(resolve => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      let settled = false;
      const done = () => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(); }
      };
      const timer = setTimeout(() => {
        try { transaction.abort(); } catch { /* Transaction already closed */ }
        done();
      }, OPEN_TIMEOUT);
      transaction.oncomplete = done;
      transaction.onerror = done;
      transaction.onabort = done;
      const request = transaction.objectStore(STORE_NAME).get(KEY);
      request.onsuccess = () => {
        // Network failures must not overwrite a newer offline snapshot.
        const stored = isCatalog(request.result) ? request.result : null;
        if (newestCatalog(stored, catalog) === catalog) {
          transaction.objectStore(STORE_NAME).put(catalog, KEY);
        }
      };
    });
  } catch { /* Quota and restricted-mode failures must never block playback. */ }
  finally { db.close(); }
}
export function newestCatalog(one: Catalog | null, two: Catalog | null): Catalog | null {
  if (!one) return two;
  if (!two) return one;
  const a = one.updatedAt ? Date.parse(one.updatedAt) : 0;
  const b = two.updatedAt ? Date.parse(two.updatedAt) : 0;
  return Number.isFinite(b) && b > (Number.isFinite(a) ? a : 0) ? two : one;
}
