import type { AddressQuery, GeocodeResult, Geocoder } from './types';

/** Mindestabstand zwischen zwei Anfragen an Nominatim, etwas über der Grenze von einer Sekunde */
export const NOMINATIM_MIN_INTERVAL_MS = 1100;

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Führt Aufgaben nacheinander aus, mit festem Mindestabstand zwischen den Starts */
export class RateLimiter {
  private nextSlot = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly minIntervalMs: number,
    private readonly clock: Clock = systemClock,
  ) {}

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const wait = this.nextSlot - this.clock.now();
      if (wait > 0) await this.clock.sleep(wait);
      this.nextSlot = this.clock.now() + this.minIntervalMs;
      return task();
    });
    // Fehler einer Aufgabe dürfen die Warteschlange nicht blockieren
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export class RateLimitedGeocoder implements Geocoder {
  readonly label: string;

  constructor(
    private readonly inner: Geocoder,
    private readonly limiter: RateLimiter,
  ) {
    this.label = inner.label;
  }

  geocode(query: AddressQuery, signal?: AbortSignal): Promise<GeocodeResult | null> {
    return this.limiter.schedule(() => {
      if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
      return this.inner.geocode(query, signal);
    });
  }
}
