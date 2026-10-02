import { describe, expect, it, vi } from 'vitest';
import {
  CachedGeocoder,
  InMemoryGeocodeCache,
  NOT_FOUND_TTL_MS,
  cacheKey,
} from '@/data/geocoding/cache';
import { NominatimGeocoder } from '@/data/geocoding/nominatimGeocoder';
import { RateLimitedGeocoder, RateLimiter, type Clock } from '@/data/geocoding/rateLimiter';
import type { AddressQuery, Geocoder } from '@/data/geocoding/types';

const query: AddressQuery = { street: 'Hafenstraße 1', postalCode: '26721', city: 'Emden' };

function fakeClock(): Clock & { t: number } {
  const clock = {
    t: 0,
    now: () => clock.t,
    sleep: async (ms: number) => {
      clock.t += ms;
    },
  };
  return clock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('NominatimGeocoder', () => {
  it('fragt die Adresse ohne Firmennamen ab und liest das Ergebnis', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse([{ lat: '53.3669', lon: '7.2060', display_name: 'Hafenstraße 1, Emden' }]),
    );
    const geocoder = new NominatimGeocoder({ fetchFn, email: 'kontakt@example.org' });
    const result = await geocoder.geocode(query);

    expect(result).toEqual({ lat: 53.3669, lng: 7.206, label: 'Hafenstraße 1, Emden' });
    const url = new URL(String((fetchFn.mock.calls[0] as unknown[])[0]));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'Hafenstraße 1, 26721 Emden',
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'de',
      'accept-language': 'de',
      email: 'kontakt@example.org',
    });
  });

  it('liefert null ohne Treffer und wirft bei HTTP-Fehlern', async () => {
    expect(
      await new NominatimGeocoder({ fetchFn: async () => jsonResponse([]) }).geocode(query),
    ).toBeNull();
    await expect(
      new NominatimGeocoder({ fetchFn: async () => jsonResponse({}, 429) }).geocode(query),
    ).rejects.toThrow('Status 429');
  });
});

describe('RateLimiter', () => {
  it('hält den Mindestabstand zwischen den Starts ein', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(1100, clock);
    const starts: number[] = [];
    await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => starts.push(clock.now()))));
    expect(starts).toEqual([0, 1100, 2200]);
  });

  it('läuft nach einem Fehler weiter', async () => {
    const limiter = new RateLimiter(10, fakeClock());
    await expect(limiter.schedule(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(limiter.schedule(async () => 'ok')).resolves.toBe('ok');
  });

  it('startet abgebrochene Anfragen nicht mehr', async () => {
    const inner: Geocoder = { label: 'X', geocode: vi.fn(async () => null) };
    const limited = new RateLimitedGeocoder(inner, new RateLimiter(10, fakeClock()));
    const controller = new AbortController();
    controller.abort();
    await expect(limited.geocode(query, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(inner.geocode).not.toHaveBeenCalled();
  });
});

describe('CachedGeocoder', () => {
  it('normalisiert den Schlüssel', () => {
    expect(cacheKey({ street: ' Hafenstraße  1', postalCode: '26721', city: 'EMDEN ' })).toBe(
      'hafenstraße 1|26721|emden',
    );
  });

  it('fragt bekannte Adressen nur einmal ab', async () => {
    const inner: Geocoder = {
      label: 'X',
      geocode: vi.fn(async () => ({ lat: 1, lng: 2, label: 'L' })),
    };
    const cached = new CachedGeocoder(inner, new InMemoryGeocodeCache());
    await cached.geocode(query);
    const second = await cached.geocode({ ...query, city: 'emden' });
    expect(second).toEqual({ lat: 1, lng: 2, label: 'L' });
    expect(inner.geocode).toHaveBeenCalledTimes(1);
  });

  it('merkt sich nicht gefundene Adressen bis zum Ablauf der Frist', async () => {
    let now = Date.parse('2026-09-01T00:00:00Z');
    const inner: Geocoder = { label: 'X', geocode: vi.fn(async () => null) };
    const cached = new CachedGeocoder(inner, new InMemoryGeocodeCache(), () => now);
    await cached.geocode(query);
    await cached.geocode(query);
    expect(inner.geocode).toHaveBeenCalledTimes(1);
    now += NOT_FOUND_TTL_MS + 1;
    await cached.geocode(query);
    expect(inner.geocode).toHaveBeenCalledTimes(2);
  });

  it('speichert bei Dienstfehlern nichts', async () => {
    const cache = new InMemoryGeocodeCache();
    const inner: Geocoder = {
      label: 'X',
      geocode: async () => Promise.reject(new Error('offline')),
    };
    await expect(new CachedGeocoder(inner, cache).geocode(query)).rejects.toThrow('offline');
    expect(await cache.count()).toBe(0);
  });
});
