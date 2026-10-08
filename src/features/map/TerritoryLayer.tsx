import { useMemo } from 'react';
import { Polygon, Polyline } from 'react-leaflet';
import { NORDWEST_MASK_HOLES, NORDWEST_STATES } from '@/data/territory/nordwestStates';

/** Außenring über die ganze Welt, das Gebiet wird als Loch ausgespart */
const WORLD: [number, number][] = [
  [85, -180],
  [85, 180],
  [-85, 180],
  [-85, -180],
];

/** Vertriebsgebiet Nordwest: Abdunklung außerhalb und Landesgrenzen */
export function TerritoryLayer() {
  const borders = useMemo(() => NORDWEST_STATES.flatMap((state) => state.rings), []);
  return (
    <>
      <Polygon
        positions={[WORLD, ...NORDWEST_MASK_HOLES]}
        pathOptions={{ className: 'map-territory-mask', weight: 0 }}
        interactive={false}
      />
      {borders.map((ring, index) => (
        <Polyline
          key={index}
          positions={[...ring, ring[0] ?? ring[ring.length - 1] ?? [0, 0]]}
          pathOptions={{ className: 'map-territory-border', weight: 1.5 }}
          interactive={false}
        />
      ))}
    </>
  );
}
