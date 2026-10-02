export interface AddressQuery {
  street: string;
  postalCode: string;
  city: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Gefundene Adresse laut Dienst, zur Kontrolle */
  label: string;
}

/** Austauschbarer Geocoder. null bedeutet: Adresse nicht gefunden. */
export interface Geocoder {
  readonly label: string;
  geocode(query: AddressQuery, signal?: AbortSignal): Promise<GeocodeResult | null>;
}

export function hasAddress(query: AddressQuery): boolean {
  return query.city.trim() !== '' || query.postalCode.trim() !== '';
}

export function formatAddress(query: AddressQuery): string {
  const place = [query.postalCode.trim(), query.city.trim()].filter(Boolean).join(' ');
  return [query.street.trim(), place].filter(Boolean).join(', ');
}
