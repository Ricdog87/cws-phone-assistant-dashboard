import { useMemo } from 'react';
import { Polygon, Polyline, Tooltip } from 'react-leaflet';
import { useAppStore } from '@/app/store';
import { NORDWEST_MASK_HOLES, NORDWEST_STATES } from '@/data/territory/nordwestStates';
import { SERVICE_TOURS } from '@/data/tours';

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

/** Weitere Servicetouren, ein Klick macht sie zur aktiven Tour */
export function OtherToursLayer() {
  const activeId = useAppStore((s) => s.route.id);
  const setTour = useAppStore((s) => s.setTour);
  return (
    <>
      {SERVICE_TOURS.filter((tour) => tour.id !== activeId).map((tour) => (
        <Polyline
          key={tour.id}
          positions={tour.points.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ className: 'map-tour', weight: 3, dashArray: '6 6' }}
          eventHandlers={{ click: () => setTour(tour.id) }}
        >
          <Tooltip sticky>
            {tour.weekday} · {tour.name}
            <br />
            Klick wählt diese Tour
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}
