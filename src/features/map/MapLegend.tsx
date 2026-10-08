import { formatInt } from '@/components/format';
import { TERRITORY_NAME } from '@/data/territory';

const ITEMS = [
  { swatch: 'legend-swatch--a', label: 'Band A' },
  { swatch: 'legend-swatch--b', label: 'Band B' },
  { swatch: 'legend-swatch--c', label: 'Band C' },
  { swatch: 'legend-swatch--customer', label: 'Bestandskunde' },
];

interface MapLegendProps {
  /** Gewählte Potenzialliste, null für alle Hunter */
  owner: string | null;
  /** Accounts der Liste ohne Kartenposition */
  withoutPosition: number;
}

export function MapLegend({ owner, withoutPosition }: MapLegendProps) {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] max-w-[16rem] rounded border border-border bg-panel p-3 text-xs">
      <p className="font-bold">{TERRITORY_NAME}</p>
      <p className="mb-2 text-muted">Potenzialliste: {owner ?? 'alle Hunter'}</p>
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full border border-brand-ink ${item.swatch}`}
            />
            {item.label}
          </li>
        ))}
        {owner && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-brand-ink opacity-30 legend-swatch--c" />
            Andere Hunter
          </li>
        )}
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-6 rounded-sm legend-swatch--territory" />
          Grenze Vertriebsgebiet
        </li>
      </ul>
      {withoutPosition > 0 && (
        <p className="mt-2 text-muted">
          {formatInt(withoutPosition)} Accounts ohne Kartenposition, in der Anrufliste vollständig.
        </p>
      )}
    </div>
  );
}
