import { Button } from '@/components/Button';
import { downloadText } from '@/components/download';
import { reasonLabel, rowErrorsToCsv } from '@/data/csvImport';
import type { RowError } from '@/data/providers/types';

const MAX_VISIBLE = 200;

export function RowErrorList({ errors }: { errors: readonly RowError[] }) {
  if (errors.length === 0) {
    return <p className="text-sm text-muted">Keine Fehler.</p>;
  }
  const visible = errors.slice(0, MAX_VISIBLE);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm">
          {errors.length} {errors.length === 1 ? 'Fehler' : 'Fehler'} in{' '}
          {new Set(errors.map((e) => e.line)).size} Zeilen
        </p>
        <Button
          onClick={() =>
            downloadText(
              rowErrorsToCsv(errors),
              `importfehler-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
        >
          Fehlerliste als CSV
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs text-muted">
            <tr>
              <th className="py-1 pr-3 font-normal">Zeile</th>
              <th className="py-1 pr-3 font-normal">Feld</th>
              <th className="py-1 pr-3 font-normal">Wert</th>
              <th className="py-1 pr-3 font-normal">Fehler</th>
              <th className="py-1 font-normal">Art</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((e, i) => (
              <tr key={`${e.line}-${e.field}-${i}`}>
                <td className="py-1 pr-3 tabular-nums">{e.line}</td>
                <td className="py-1 pr-3">{e.field}</td>
                <td className="max-w-[12rem] truncate py-1 pr-3" title={e.value}>
                  {e.value || '–'}
                </td>
                <td className="py-1 pr-3">{e.message}</td>
                <td className="py-1 text-muted">{reasonLabel(e.reason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errors.length > MAX_VISIBLE && (
        <p className="mt-2 text-xs text-muted">
          Die ersten {MAX_VISIBLE} Fehler sind aufgeführt, die vollständige Liste steht im
          CSV-Export.
        </p>
      )}
    </div>
  );
}
