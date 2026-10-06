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

const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Kurswinkel von a nach b in Grad (0 = Nord, im Uhrzeigersinn) */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Punkt in gegebener Entfernung und Richtung von einem Ausgangspunkt */
export function destinationPoint(origin: LatLng, bearingDeg: number, distanceKm: number): LatLng {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(origin.lat);
  const λ1 = toRad(origin.lng);
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const φ2 = Math.asin(sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/**
 * Geschlossenes Polygon um die Serviceroute: ein Streifen von ±halfWidthKm.
 * Für die Karte, damit der Korridor als echte Zone statt als dicke Linie wirkt.
 */
export function corridorPolygon(line: readonly LatLng[], halfWidthKm: number): LatLng[] {
  if (line.length === 0 || halfWidthKm <= 0) return [];
  if (line.length === 1) {
    const center = line[0];
    if (!center) return [];
    const ring: LatLng[] = [];
    for (let i = 0; i < 16; i++) {
      ring.push(destinationPoint(center, (i * 360) / 16, halfWidthKm));
    }
    const first = ring[0];
    if (first) ring.push(first);
    return ring;
  }

  const left: LatLng[] = [];
  const right: LatLng[] = [];

  for (let i = 0; i < line.length; i++) {
    const curr = line[i];
    if (!curr) continue;
    const prev = line[i - 1];
    const next = line[i + 1];
    let bearing: number;
    if (!prev && next) bearing = bearingDegrees(curr, next);
    else if (prev && !next) bearing = bearingDegrees(prev, curr);
    else if (prev && next) {
      const b1 = bearingDegrees(prev, curr);
      const b2 = bearingDegrees(curr, next);
      const diff = ((b2 - b1 + 540) % 360) - 180;
      bearing = (b1 + diff / 2 + 360) % 360;
    } else {
      continue;
    }
    left.push(destinationPoint(curr, (bearing - 90 + 360) % 360, halfWidthKm));
    right.push(destinationPoint(curr, (bearing + 90) % 360, halfWidthKm));
  }

  if (left.length === 0) return [];
  const ring = [...left, ...right.reverse()];
  const first = ring[0];
  if (first) ring.push(first);
  return ring;
}
