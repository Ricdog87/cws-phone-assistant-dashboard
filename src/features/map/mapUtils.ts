import type { Band } from '@/domain/types';

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
