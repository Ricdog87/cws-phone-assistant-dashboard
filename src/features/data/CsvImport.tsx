import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { geocodeCache, geocoder, mappingRepository } from '@/app/services';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { Toggle } from '@/components/Toggle';
import { formatInt } from '@/components/format';
import { validateCsvRows, type ImportProgress } from '@/data/csvImport';
import {
  CSV_FIELDS,
  mappingProblems,
  suggestMapping,
  type ColumnMapping,
  type CsvTargetField,
} from '@/data/csvMapping';
import { NOMINATIM_MIN_INTERVAL_MS } from '@/data/geocoding/rateLimiter';
import { CsvProvider, readCsvFile, type ParsedCsv } from '@/data/providers/csvProvider';

type MappingSource = 'saved' | 'auto';

function sampleValue(csv: ParsedCsv, column: string | undefined): string {
  if (!column) return '';
  return csv.rows.find((r) => (r[column] ?? '').trim() !== '')?.[column]?.trim() ?? '';
}

function formatDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? 'unter einer Minute' : `ca. ${minutes} Minuten`;
}

export function CsvImport() {
  const loadFromProvider = useAppStore((s) => s.loadFromProvider);
  const loading = useAppStore((s) => s.loading);
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingSource, setMappingSource] = useState<MappingSource>('auto');
  const [parseError, setParseError] = useState<string | null>(null);
  const [useGeocoder, setUseGeocoder] = useState(true);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileId = useId();

  useEffect(() => {
    void geocodeCache.count().then(setCacheSize);
  }, [loading]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParseError(null);
    try {
      const parsed = await readCsvFile(file);
      if (parsed.headers.length === 0) throw new Error('Die Datei enthält keine Kopfzeile.');
      const saved = await mappingRepository.find(parsed.headers);
      setCsv(parsed);
      setFileName(file.name);
      setMapping({ ...suggestMapping(parsed.headers), ...(saved ?? {}) });
      setMappingSource(saved ? 'saved' : 'auto');
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

  const problems = mappingProblems(mapping);
  const preview = useMemo(
    () => (csv && problems.length === 0 ? validateCsvRows(csv.rows, mapping) : null),
    // problems leitet sich vollständig aus mapping ab
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [csv, mapping],
  );
  const toGeocode = preview?.valid.filter((v) => v.needsGeocoding).length ?? 0;
  const running = progress !== null;

  async function runImport() {
    if (!csv) return;
    await mappingRepository.save(csv.headers, mapping);
    const controller = new AbortController();
    abortRef.current = controller;
    const provider = new CsvProvider(csv, mapping, {
      geocoder: useGeocoder ? geocoder : null,
      onProgress: setProgress,
      signal: controller.signal,
    });
    try {
      await loadFromProvider(provider, () => provider.getReport());
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
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
          disabled={running}
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="text-sm"
        />
        <p className="mt-1 text-xs text-muted">
          Komma, Semikolon oder Tab als Trennzeichen, erste Zeile mit Spaltennamen. Zahlen mit Punkt
          oder Komma.
        </p>
        {parseError && <p className="mt-2 text-sm font-bold text-brand-primary">{parseError}</p>}
      </div>

      {csv && (
        <>
          <p className="text-sm">
            <strong>{fileName}</strong>: {formatInt(csv.rows.length)} Zeilen, {csv.headers.length}{' '}
            Spalten.{' '}
            {mappingSource === 'saved'
              ? 'Zuordnung aus einem früheren Import übernommen.'
              : 'Zuordnung automatisch aus den Spaltennamen vorgeschlagen.'}
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-normal">Zielfeld</th>
                <th className="py-1 pr-3 font-normal">Quellspalte</th>
                <th className="py-1 font-normal">Beispielwert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CSV_FIELDS.map((spec) => (
                <tr key={spec.field}>
                  <td className="py-1.5 pr-3">
                    {spec.label}
                    {spec.required && <span className="ml-1 font-bold">*</span>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <select
                      aria-label={`Quellspalte für ${spec.label}`}
                      value={mapping[spec.field] ?? ''}
                      disabled={running}
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
                  <td className="max-w-[14rem] truncate py-1.5 text-muted">
                    {sampleValue(csv, mapping[spec.field])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted">
            * Pflichtfeld. Zusätzlich braucht es Breiten- und Längengrad oder Ort bzw. PLZ.
          </p>

          {problems.length > 0 ? (
            <ul className="list-disc pl-5 text-sm font-bold text-brand-primary">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            preview && (
              <div className="rounded bg-surface p-3 text-sm" aria-label="Vorprüfung">
                <strong>Vorprüfung:</strong> {formatInt(preview.valid.length - toGeocode)} mit
                Koordinaten, {formatInt(toGeocode)} nachzuschlagen, {formatInt(preview.invalidRows)}{' '}
                fehlerhaft, {formatInt(preview.missingCoordinateRows)} ohne Adresse (nur ohne
                Karte).
              </div>
            )
          )}

          <Toggle
            label="Adressen für die Karte nachschlagen"
            checked={useGeocoder}
            onChange={setUseGeocoder}
            hint={`Nur für die Karte nötig, die Anrufliste funktioniert auch ohne. Über ${geocoder.label}. Übermittelt werden nur Straße, PLZ und Ort, keine Firmennamen. Höchstens eine Anfrage pro Sekunde, bereits bekannte Adressen kommen aus dem lokalen Zwischenspeicher${cacheSize === null ? '' : ` (${formatInt(cacheSize)} Adressen)`}.`}
          />
          {useGeocoder && toGeocode > 0 && (
            <p className="text-xs text-muted">
              Dauer höchstens {formatDuration(toGeocode * NOMINATIM_MIN_INTERVAL_MS)}.
              {toGeocode > 500 &&
                ' Für so große Mengen besser ohne Nachschlagen importieren, Koordinaten im Quellsystem pflegen oder einen eigenen Geocoder anbinden.'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={problems.length > 0 || loading || running}
              onClick={() => void runImport()}
            >
              Importieren
            </Button>
            {running && (
              <>
                <span className="text-sm tabular-nums" role="status">
                  Nachschlagen {formatInt(progress.done)} von {formatInt(progress.total)}
                </span>
                <Button onClick={() => abortRef.current?.abort()}>Abbrechen</Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
