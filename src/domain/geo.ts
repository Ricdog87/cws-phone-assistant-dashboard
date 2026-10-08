/** Ring als Liste von [Breite, Länge] */
export type Ring = readonly (readonly [number, number])[];

/** Strahlverfahren: liegt der Punkt innerhalb des geschlossenen Rings? */
export function pointInRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i] ?? [0, 0];
    const [yj, xj] = ring[j] ?? [0, 0];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
