import { describe, expect, it } from 'vitest';
import {
  EARTH_RADIUS_KM,
  detourMinutes,
  distanceToPolylineKm,
  distanceToSegmentKm,
  haversineKm,
} from '@/domain/geo';
import type { LatLng } from '@/domain/types';

const KM_PER_DEGREE_LAT = (2 * Math.PI * EARTH_RADIUS_KM) / 360; // 111,19492664 km

// Nord-Süd-Route entlang 8,0° Ost
const route: LatLng[] = [
  { lat: 53.0, lng: 8.0 },
  { lat: 53.1, lng: 8.0 },
  { lat: 53.2, lng: 8.0 },
];

/** Längengrad-Versatz, der auf Breite lat genau km Kilometer ergibt */
function lngOffsetForKm(lat: number, km: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (2 * Math.asin(Math.sin(km / (2 * EARTH_RADIUS_KM)) / Math.cos(latRad)) * 180) / Math.PI;
}

describe('haversineKm', () => {
  it('liefert 0 für identische Punkte', () => {
    expect(haversineKm({ lat: 53.1, lng: 8.2 }, { lat: 53.1, lng: 8.2 })).toBe(0);
  });

  it('misst einen Breitengrad mit 111,195 km', () => {
    expect(haversineKm({ lat: 53, lng: 8 }, { lat: 54, lng: 8 })).toBeCloseTo(111.195, 3);
  });

  it('ist symmetrisch', () => {
    const a = { lat: 53.0793, lng: 8.8017 };
    const b = { lat: 53.1435, lng: 8.2146 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

describe('distanceToPolylineKm', () => {
  it('ergibt 0 für einen Lead exakt auf der Route', () => {
    expect(distanceToPolylineKm({ lat: 53.05, lng: 8.0 }, route)).toBeCloseTo(0, 9);
    expect(distanceToPolylineKm({ lat: 53.1, lng: 8.0 }, route)).toBe(0);
  });

  it('ergibt 10 km für einen Lead 10 km östlich der Route', () => {
    const lead = { lat: 53.15, lng: 8.0 + lngOffsetForKm(53.15, 10) };
    expect(distanceToPolylineKm(lead, route)).toBeCloseTo(10, 6);
  });

  it('ergibt 10 km für einen Lead 10 km nördlich des Routenendes', () => {
    const lead = { lat: 53.2 + 10 / KM_PER_DEGREE_LAT, lng: 8.0 };
    expect(distanceToPolylineKm(lead, route)).toBeCloseTo(10, 6);
  });

  it('nimmt das nächstgelegene Segment', () => {
    const bent: LatLng[] = [
      { lat: 53.0, lng: 8.0 },
      { lat: 53.0, lng: 8.2 },
      { lat: 53.2, lng: 8.2 },
    ];
    const lead = { lat: 53.1, lng: 8.2 };
    expect(distanceToPolylineKm(lead, bent)).toBe(0);
  });

  it('begrenzt den Fußpunkt auf das Segment', () => {
    const a = { lat: 53.0, lng: 8.0 };
    const b = { lat: 53.1, lng: 8.0 };
    const beyond = { lat: 53.0 - 5 / KM_PER_DEGREE_LAT, lng: 8.0 };
    expect(distanceToSegmentKm(beyond, a, b)).toBeCloseTo(5, 6);
  });

  it('behandelt eine Route aus einem Punkt als Punktabstand', () => {
    const only = { lat: 53.0, lng: 8.0 };
    const lead = { lat: 53.0 + 3 / KM_PER_DEGREE_LAT, lng: 8.0 };
    expect(distanceToPolylineKm(lead, [only])).toBeCloseTo(3, 6);
  });

  it('liefert Unendlich für eine leere Route', () => {
    expect(distanceToPolylineKm({ lat: 53, lng: 8 }, [])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('detourMinutes', () => {
  it('ergibt 2 Minuten Stopp-Overhead bei 0 km', () => {
    expect(detourMinutes(0)).toBe(2);
  });

  it('ergibt 7,3 Minuten bei 2 km', () => {
    expect(detourMinutes(2)).toBe(7.3);
  });

  it('ergibt 28,7 Minuten bei 10 km', () => {
    expect(detourMinutes(10)).toBe(28.7);
  });

  it('rundet auf eine Nachkommastelle', () => {
    // (2 * 1 / 45 * 60 + 2) = 4,6667
    expect(detourMinutes(1)).toBe(4.7);
  });
});
