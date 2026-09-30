import { useId, useState } from 'react';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import {
  CSV_FIELDS,
  suggestMapping,
  type ColumnMapping,
  type CsvTargetField,
} from '@/data/csvMapping';
import { CsvProvider, readCsvFile, type ParsedCsv } from '@/data/providers/csvProvider';

export function CsvImport() {
  const loadFromProvider = useAppStore((s) => s.loadFromProvider);
  const loading = useAppStore((s) => s.loading);
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const fileId = useId();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParseError(null);
    try {
      const parsed = await readCsvFile(file);
      if (parsed.headers.length === 0) throw new Error('Die Datei enthält keine Kopfzeile.');
      setCsv(parsed);
      setFileName(file.name);
      setMapping(suggestMapping(parsed.headers));
    } catch (error) {
      setCsv(null);
      setParseError(error instanceof Error ? error.message : 'Datei konnte nicht gelesen werden.');
    }
  }

  function setField(field: CsvTargetField, column: string) {
    setMapping((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== field));
      return column ? { ...rest, [field]: column } : rest;
    });
  }

  const missingRequired = CSV_FIELDS.filter((f) => f.required && !mapping[f.field]);

  async function runImport() {
    if (!csv) return;
    const provider = new CsvProvider(csv, mapping);
    await loadFromProvider(provider, () => provider.getReport());
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={fileId} className="mb-1 block text-sm font-bold">
          CSV-Datei
        </label>
        <input
          id={fileId}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          Komma oder Semikolon als Trennzeichen, erste Zeile mit Spaltennamen. Zahlen mit Punkt oder
          Komma.
        </p>
        {parseError && <p className="mt-2 text-sm font-bold text-brand-primary">{parseError}</p>}
      </div>

      {csv && (
        <>
          <p className="text-sm">
            <strong>{fileName}</strong>: {csv.rows.length} Zeilen, {csv.headers.length} Spalten
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 font-normal">Zielfeld</th>
                <th className="py-1 font-normal">Quellspalte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CSV_FIELDS.map((spec) => (
                <tr key={spec.field}>
                  <td className="py-1.5">
                    {spec.label}
                    {spec.required && <span className="ml-1 font-bold">*</span>}
                  </td>
                  <td className="py-1.5">
                    <select
                      aria-label={`Quellspalte für ${spec.label}`}
                      value={mapping[spec.field] ?? ''}
                      onChange={(e) => setField(spec.field, e.target.value)}
                      className="w-full rounded border border-border bg-panel px-2 py-1"
                    >
                      <option value="">nicht zugeordnet</option>
                      {csv.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              disabled={missingRequired.length > 0 || loading}
              onClick={() => void runImport()}
            >
              Importieren
            </Button>
            {missingRequired.length > 0 && (
              <span className="text-xs text-muted">
                Pflichtfelder fehlen: {missingRequired.map((f) => f.label).join(', ')}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
