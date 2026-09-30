import { formatAddress, type AddressQuery, type GeocodeResult, type Geocoder } from './types';

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface NominatimOptions {
  baseUrl?: string;
  /** Kontaktadresse laut Nutzungsrichtlinie von Nominatim, optional */
  email?: string;
  countryCodes?: string;
  fetchFn?: typeof fetch;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
}

function isHit(value: unknown): value is NominatimHit {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lat === 'string' && typeof v.lon === 'string' && typeof v.display_name === 'string'
  );
}

/**
 * Geocoder über den öffentlichen Nominatim-Dienst von OpenStreetMap.
 * Höchstens eine Anfrage pro Sekunde, deshalb immer mit RateLimitedGeocoder verwenden.
 */
export class NominatimGeocoder implements Geocoder {
  readonly label = 'OpenStreetMap Nominatim';
  private readonly baseUrl: string;
  private readonly email: string | undefined;
  private readonly countryCodes: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: NominatimOptions = {}) {
    this.baseUrl = options.baseUrl ?? NOMINATIM_URL;
    this.email = options.email;
    this.countryCodes = options.countryCodes ?? 'de';
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  buildUrl(query: AddressQuery): string {
    const params = new URLSearchParams({
      q: formatAddress(query),
      format: 'jsonv2',
      limit: '1',
      countrycodes: this.countryCodes,
      'accept-language': 'de',
    });
    if (this.email) params.set('email', this.email);
    return `${this.baseUrl}?${params.toString()}`;
  }

  async geocode(query: AddressQuery, signal?: AbortSignal): Promise<GeocodeResult | null> {
    const response = await this.fetchFn(this.buildUrl(query), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Nominatim antwortet mit Status ${response.status}`);
    const body: unknown = await response.json();
    const hit = Array.isArray(body) ? body.find(isHit) : undefined;
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: hit.display_name };
  }
}
