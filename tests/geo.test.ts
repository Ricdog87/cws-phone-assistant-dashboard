import { describe, expect, it } from 'vitest';
import { pointInRing, type Ring } from '@/domain/geo';

// Quadrat um Bremen, Punkte als [Breite, Länge]
const square: Ring = [
  [53.0, 8.7],
  [53.0, 8.9],
  [53.2, 8.9],
  [53.2, 8.7],
];

describe('pointInRing', () => {
  it('erkennt Punkte innerhalb', () => {
    expect(pointInRing(53.08, 8.8, square)).toBe(true);
  });

  it('erkennt Punkte außerhalb', () => {
    expect(pointInRing(53.3, 8.8, square)).toBe(false);
    expect(pointInRing(53.08, 9.0, square)).toBe(false);
  });

  it('liefert für einen leeren Ring false', () => {
    expect(pointInRing(53.08, 8.8, [])).toBe(false);
  });
});
