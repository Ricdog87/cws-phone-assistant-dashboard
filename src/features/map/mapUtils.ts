import type { Band } from '@/domain/types';

/** Meter pro Pixel in Web-Mercator auf gegebener Breite und Zoomstufe */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Linienbreite in Pixeln, die einem Korridor von ±corridorKm entspricht */
export function corridorWeightPx(corridorKm: number, lat: number, zoom: number): number {
  return Math.max(2, (2 * corridorKm * 1000) / metersPerPixel(lat, zoom));
}

export function markerClass(band: Band, inCorridor: boolean, selected: boolean): string {
  return [
    'lead-marker',
    `lead-marker--${band.toLowerCase()}`,
    inCorridor ? '' : 'lead-marker--outside',
    selected ? 'lead-marker--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Ersetzt die Marker-Klassen eines Elements, übrige Leaflet-Klassen bleiben erhalten */
export function applyMarkerClasses(element: Element, className: string): void {
  const keep = Array.from(element.classList).filter((c) => !c.startsWith('lead-marker'));
  element.setAttribute('class', [...keep, ...className.split(' ')].join(' '));
}
