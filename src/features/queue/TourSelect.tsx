import { useId } from 'react';
import { useAppStore } from '@/app/store';
import { SERVICE_TOURS, type TerritoryRegionId } from '@/data/tours';

const GROUPS: { id: TerritoryRegionId; label: string }[] = [
  { id: 'nord', label: 'Region Nord' },
  { id: 'nrw', label: 'Region NRW' },
];

/** Auswahl der Servicetour. Warteschlange, Korridor und Karte folgen ihr. */
export function TourSelect() {
  const tourId = useAppStore((s) => s.route.id);
  const setTour = useAppStore((s) => s.setTour);
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted">
        Tour
      </label>
      <select
        id={id}
        value={tourId}
        onChange={(event) => setTour(event.target.value)}
        className="min-w-0 max-w-[16rem] rounded border border-border bg-panel px-2 py-1 text-xs font-bold"
      >
        {GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {SERVICE_TOURS.filter((tour) => tour.regionId === group.id).map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.weekday.slice(0, 2)} · {tour.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
