import { formatKm } from '@/components/format';

const ITEMS = [
  { swatch: 'legend-swatch--a', label: 'Band A' },
  { swatch: 'legend-swatch--b', label: 'Band B' },
  { swatch: 'legend-swatch--c', label: 'Band C' },
  { swatch: 'legend-swatch--customer', label: 'Bestandskunde' },
];

export function MapLegend({ corridorKm }: { corridorKm: number }) {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] max-w-[16rem] rounded border border-border bg-panel p-3 text-xs">
      <p className="mb-2 font-bold">Karte</p>
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
          <span className="inline-block h-2 w-6 rounded-sm border border-brand-ink bg-brand-ink" />
          Serviceroute
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-block h-3 w-6 opacity-50 legend-swatch--corridor" />
          <span>
            Servicekorridor ±{formatKm(corridorKm)}
            <span className="mt-0.5 block text-muted">
              Gelbe Zone um die Route. Nur Leads darin kommen in die Anrufliste.
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
}
