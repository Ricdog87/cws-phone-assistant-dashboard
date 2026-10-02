import { CachedGeocoder, type GeocodeCache } from './cache';
import { NominatimGeocoder } from './nominatimGeocoder';
import { NOMINATIM_MIN_INTERVAL_MS, RateLimitedGeocoder, RateLimiter } from './rateLimiter';
import type { Geocoder } from './types';

export type GeocoderKind = 'nominatim';

export interface GeocoderConfig {
  kind: GeocoderKind;
  cache: GeocodeCache;
  nominatimEmail?: string;
}

/**
 * Baut den Standard-Geocoder: Zwischenspeicher vor Rate-Limit vor Dienst.
 * Treffer aus dem Zwischenspeicher belasten das Rate-Limit nicht.
 * Ein weiterer Dienst wird als eigene Geocoder-Klasse ergänzt und hier eingetragen.
 */
export function createGeocoder(config: GeocoderConfig): Geocoder {
  switch (config.kind) {
    case 'nominatim': {
      const service = new NominatimGeocoder({ email: config.nominatimEmail });
      const limited = new RateLimitedGeocoder(service, new RateLimiter(NOMINATIM_MIN_INTERVAL_MS));
      return new CachedGeocoder(limited, config.cache);
    }
  }
}

export type { AddressQuery, GeocodeResult, Geocoder } from './types';
