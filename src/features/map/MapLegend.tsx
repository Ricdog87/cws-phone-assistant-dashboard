import { formatKm } from '@/components/format';

const ITEMS = [
  { swatch: 'legend-swatch--a', label: 'Band A' },
  { swatch: 'legend-swatch--b', label: 'Band B' },
  { swatch: 'legend-swatch--c', label: 'Band C' },
  { swatch: 'legend-swatch--customer', label: 'Bestandskunde' },
];

export function MapLegend({ corridorKm }: { corridorKm: number }) {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded border border-border bg-panel p-3 text-xs">
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full border border-brand-ink ${item.swatch}`}
            />
            {item.label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-brand-ink opacity-30 legend-swatch--c" />
          Außerhalb des Korridors
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-6 opacity-40 legend-swatch--corridor" />
          Korridor ±{formatKm(corridorKm)}
        </li>
      </ul>
    </div>
  );
}
