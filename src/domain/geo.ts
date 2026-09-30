import type { LatLng } from './types';

export const EARTH_RADIUS_KM = 6371;
/** Durchschnittsgeschwindigkeit des Servicefahrzeugs in km/h */
export const AVERAGE_SPEED_KMH = 45;
/** Zeitaufwand je zusätzlichem Stopp in Minuten */
export const STOP_OVERHEAD_MINUTES = 2;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Großkreisentfernung zweier Punkte in Kilometern */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Abstand eines Punkts zu einem Segment. Der Fußpunkt wird in einer lokalen
 * Projektion bestimmt (Längengrade mit cos(Breitengrad) gestaucht), die
 * Entfernung zum Fußpunkt anschließend per Haversine gemessen.
 */
export function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const cosLat = Math.cos(toRad(p.lat));
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const dx = b.lng * cosLat - ax;
  const dy = b.lat - ay;
  const px = p.lng * cosLat;
  const py = p.lat;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const foot: LatLng = { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
  return haversineKm(p, foot);
}

/** Kleinster Abstand zu allen Segmenten der Polyline in Kilometern */
export function distanceToPolylineKm(p: LatLng, line: readonly LatLng[]): number {
  const first = line[0];
  if (!first) return Number.POSITIVE_INFINITY;
  if (line.length === 1) return haversineKm(p, first);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    min = Math.min(min, distanceToSegmentKm(p, a, b));
  }
  return min;
}

/** Umweg in Minuten: hin und zurück bei Durchschnittstempo plus Stopp-Overhead, auf eine Nachkommastelle */
export function detourMinutes(distanceKm: number): number {
  const minutes = ((2 * distanceKm) / AVERAGE_SPEED_KMH) * 60 + STOP_OVERHEAD_MINUTES;
  return Math.round(minutes * 10) / 10;
}
