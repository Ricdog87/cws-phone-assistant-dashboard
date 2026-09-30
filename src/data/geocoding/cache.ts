import type { AppDatabase, GeocodeCacheEntry } from '../db';
import type { AddressQuery, GeocodeResult, Geocoder } from './types';

/** Nicht gefundene Adressen werden nach dieser Frist erneut nachgeschlagen */
export const NOT_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GeocodeCache {
  get(key: string): Promise<GeocodeCacheEntry | undefined>;
  put(entry: GeocodeCacheEntry): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export function cacheKey(query: AddressQuery): string {
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
  return [norm(query.street), norm(query.postalCode), norm(query.city)].join('|');
}

export class DexieGeocodeCache implements GeocodeCache {
  constructor(private readonly db: AppDatabase) {}

  get(key: string) {
    return this.db.geocodeCache.get(key);
  }

  async put(entry: GeocodeCacheEntry) {
    await this.db.geocodeCache.put(entry);
  }

  async clear() {
    await this.db.geocodeCache.clear();
  }

  count() {
    return this.db.geocodeCache.count();
  }
}

export class InMemoryGeocodeCache implements GeocodeCache {
  private readonly entries = new Map<string, GeocodeCacheEntry>();

  async get(key: string) {
    return this.entries.get(key);
  }

  async put(entry: GeocodeCacheEntry) {
    this.entries.set(entry.key, entry);
  }

  async clear() {
    this.entries.clear();
  }

  async count() {
    return this.entries.size;
  }
}

/** Legt einen lokalen Zwischenspeicher vor einen beliebigen Geocoder */
export class CachedGeocoder implements Geocoder {
  readonly label: string;

  constructor(
    private readonly inner: Geocoder,
    private readonly cache: GeocodeCache,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.label = inner.label;
  }

  async geocode(query: AddressQuery, signal?: AbortSignal): Promise<GeocodeResult | null> {
    const key = cacheKey(query);
    const cached = await this.cache.get(key);
    if (cached) {
      if (cached.found && cached.lat !== null && cached.lng !== null) {
        return { lat: cached.lat, lng: cached.lng, label: cached.label ?? '' };
      }
      const age = this.now() - Date.parse(cached.cachedAt);
      if (!cached.found && age < NOT_FOUND_TTL_MS) return null;
    }
    const result = await this.inner.geocode(query, signal);
    await this.cache.put({
      key,
      found: result !== null,
      lat: result?.lat ?? null,
      lng: result?.lng ?? null,
      label: result?.label ?? null,
      cachedAt: new Date(this.now()).toISOString(),
    });
    return result;
  }
}
