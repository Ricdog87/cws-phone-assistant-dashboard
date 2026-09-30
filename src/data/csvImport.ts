import { z } from 'zod';
import { CSV_BOM, CSV_SEPARATOR, escapeCsvCell } from '@/domain/export';
import type { Lead } from '@/domain/types';
import {
  CSV_FIELDS,
  fieldLabel,
  parseBoolean,
  parseNumber,
  type ColumnMapping,
  type CsvTargetField,
} from './csvMapping';
import { hasAddress, type AddressQuery, type Geocoder } from './geocoding/types';
import type { LoadReport, RowError } from './providers/types';

/** Nach so vielen Dienstfehlern in Folge wird das Nachschlagen für den Rest abgebrochen */
export const MAX_CONSECUTIVE_SERVICE_ERRORS = 3;

const text = z.string().trim();
const optionalText = text.transform((v) => (v === '' ? null : v));

const count = z.string().transform((raw, ctx) => {
  const value = raw.trim();
  if (value === '') return 0;
  const n = parseNumber(value);
  if (n === null) {
    ctx.addIssue({ code: 'custom', message: 'ist keine Zahl' });
    return z.NEVER;
  }
  if (n < 0 || !Number.isInteger(n)) {
    ctx.addIssue({ code: 'custom', message: 'muss eine ganze Zahl ab 0 sein' });
    return z.NEVER;
  }
  return n;
});

const coordinate = (limit: number) =>
  z.string().transform((raw, ctx) => {
    const value = raw.trim();
    if (value === '') return null;
    const n = parseNumber(value);
    if (n === null) {
      ctx.addIssue({ code: 'custom', message: 'ist keine Zahl' });
      return z.NEVER;
    }
    if (Math.abs(n) > limit) {
      ctx.addIssue({ code: 'custom', message: `liegt außerhalb von ±${limit}` });
      return z.NEVER;
    }
    return n;
  });

const flag = z.string().transform((raw, ctx) => {
  const value = parseBoolean(raw);
  if (value === null) {
    ctx.addIssue({ code: 'custom', message: 'ist kein Ja/Nein-Wert' });
    return z.NEVER;
  }
  return value;
});

/** Schema einer Importzeile. Eingabe sind die zugeordneten Rohwerte als Text. */
export const csvRowSchema = z.object({
  id: text,
  name: text.min(1, 'fehlt'),
  industry: text,
  street: text,
  postalCode: text,
  city: text,
  lat: coordinate(90),
  lng: coordinate(180),
  commercialEmployees: count,
  wearerCount: count,
  phone: text,
  hasDirectDial: flag,
  contactName: optionalText,
  contactRole: optionalText,
  openPositions: count,
  certification: optionalText,
  siteExpansion: flag,
  managementChange: flag,
  isCustomer: flag,
});

export type CsvRow = z.output<typeof csvRowSchema>;

export interface ValidRow {
  line: number;
  row: CsvRow;
  id: string;
  /** Koordinaten fehlen, Adresse ist vorhanden */
  needsGeocoding: boolean;
}

export interface RowValidation {
  valid: ValidRow[];
  errors: RowError[];
  invalidRows: number;
  missingCoordinateRows: number;
}

/** Zeile 1 ist die Kopfzeile */
export const lineOf = (index: number): number => index + 2;

function rawValues(
  row: Record<string, string>,
  mapping: ColumnMapping,
): Record<CsvTargetField, string> {
  return Object.fromEntries(
    CSV_FIELDS.map((spec) => {
      const column = mapping[spec.field];
      return [spec.field, column ? (row[column] ?? '') : ''];
    }),
  ) as Record<CsvTargetField, string>;
}

function hasCoordinates(row: CsvRow): boolean {
  return row.lat !== null && row.lng !== null && !(row.lat === 0 && row.lng === 0);
}

export function addressOf(row: CsvRow): AddressQuery {
  return { street: row.street, postalCode: row.postalCode, city: row.city };
}

/** Prüft alle Zeilen. Jede Zeile kann mehrere Fehler haben. */
export function validateCsvRows(
  rows: readonly Record<string, string>[],
  mapping: ColumnMapping,
): RowValidation {
  const valid: ValidRow[] = [];
  const errors: RowError[] = [];
  const seenIds = new Set<string>();
  let invalidRows = 0;
  let missingCoordinateRows = 0;

  rows.forEach((source, index) => {
    const line = lineOf(index);
    const raw = rawValues(source, mapping);
    const parsed = csvRowSchema.safeParse(raw);

    if (!parsed.success) {
      invalidRows++;
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as CsvTargetField;
        errors.push({
          line,
          field: fieldLabel(field),
          value: raw[field] ?? '',
          message: issue.message,
          reason: 'invalid',
        });
      }
      return;
    }

    const row = parsed.data;
    const id = row.id || `CSV-${String(index + 1).padStart(4, '0')}`;
    if (seenIds.has(id)) {
      invalidRows++;
      errors.push({
        line,
        field: 'ID',
        value: id,
        message: 'kommt mehrfach vor',
        reason: 'invalid',
      });
      return;
    }
    seenIds.add(id);

    if (hasCoordinates(row)) {
      valid.push({ line, row, id, needsGeocoding: false });
    } else if (hasAddress(addressOf(row))) {
      valid.push({ line, row, id, needsGeocoding: true });
    } else {
      missingCoordinateRows++;
      errors.push({
        line,
        field: 'Koordinaten',
        value: '',
        message: 'fehlen, und es gibt keine Adresse zum Nachschlagen',
        reason: 'missing_coordinates',
      });
    }
  });

  return { valid, errors, invalidRows, missingCoordinateRows };
}

function toLead(entry: ValidRow, lat: number, lng: number): Lead {
  const { row } = entry;
  return {
    id: entry.id,
    name: row.name,
    industry: row.industry,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    lat,
    lng,
    commercialEmployees: row.commercialEmployees,
    wearerCount: row.wearerCount,
    phone: row.phone,
    hasDirectDial: row.hasDirectDial,
    contactName: row.contactName,
    contactRole: row.contactRole,
    openPositions: row.openPositions,
    certification: row.certification,
    siteExpansion: row.siteExpansion,
    managementChange: row.managementChange,
    isCustomer: row.isCustomer,
  };
}

export interface ImportProgress {
  done: number;
  total: number;
}

export interface ImportOptions {
  /** null schaltet das Nachschlagen aus */
  geocoder: Geocoder | null;
  onProgress?: (progress: ImportProgress) => void;
  signal?: AbortSignal;
}

export interface CsvImportResult {
  leads: Lead[];
  report: LoadReport;
}

export class ImportAbortedError extends Error {
  constructor() {
    super('Import abgebrochen.');
    this.name = 'ImportAbortedError';
  }
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted) || (error instanceof Error && error.name === 'AbortError');
}

/** Validiert, ergänzt fehlende Koordinaten über den Geocoder und liefert Leads mit Bericht */
export async function importCsvRows(
  rows: readonly Record<string, string>[],
  mapping: ColumnMapping,
  options: ImportOptions,
): Promise<CsvImportResult> {
  const { geocoder, onProgress, signal } = options;
  const validation = validateCsvRows(rows, mapping);
  const errors = [...validation.errors];
  const leads: Lead[] = [];
  let geocoded = 0;
  let missing = validation.missingCoordinateRows;
  let consecutiveServiceErrors = 0;

  const total = validation.valid.filter((v) => v.needsGeocoding).length;
  let done = 0;
  onProgress?.({ done, total });

  const reject = (entry: ValidRow, reason: RowError['reason'], message: string) => {
    missing++;
    errors.push({
      line: entry.line,
      field: 'Adresse',
      value: formatAddressOf(entry),
      message,
      reason,
    });
  };

  for (const entry of validation.valid) {
    const { row } = entry;
    if (!entry.needsGeocoding && row.lat !== null && row.lng !== null) {
      leads.push(toLead(entry, row.lat, row.lng));
      continue;
    }
    if (signal?.aborted) throw new ImportAbortedError();

    if (!geocoder) {
      reject(entry, 'missing_coordinates', 'keine Koordinaten, Nachschlagen ist ausgeschaltet');
    } else if (consecutiveServiceErrors >= MAX_CONSECUTIVE_SERVICE_ERRORS) {
      reject(entry, 'geocode_failed', 'nicht nachgeschlagen, Dienst nicht erreichbar');
    } else {
      try {
        const result = await geocoder.geocode(addressOf(row), signal);
        consecutiveServiceErrors = 0;
        if (result) {
          geocoded++;
          leads.push(toLead(entry, result.lat, result.lng));
        } else {
          reject(entry, 'geocode_failed', 'Adresse nicht gefunden');
        }
      } catch (error) {
        if (isAbort(error, signal)) throw new ImportAbortedError();
        consecutiveServiceErrors++;
        reject(
          entry,
          'geocode_failed',
          `Nachschlagen fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannt'}`,
        );
      }
    }
    done++;
    onProgress?.({ done, total });
  }

  errors.sort((a, b) => a.line - b.line);
  return {
    leads,
    report: {
      total: rows.length,
      loaded: leads.length,
      geocoded,
      rejectedMissingCoordinates: missing,
      rejectedInvalid: validation.invalidRows,
      rowErrors: errors,
    },
  };
}

function formatAddressOf(entry: ValidRow): string {
  const { street, postalCode, city } = entry.row;
  return [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

const REASON_LABELS: Record<RowError['reason'], string> = {
  invalid: 'Ungültiger Wert',
  missing_coordinates: 'Ohne Koordinaten',
  geocode_failed: 'Nicht gefunden',
};

export function reasonLabel(reason: RowError['reason']): string {
  return REASON_LABELS[reason];
}

/** Fehlerliste als CSV mit Semikolon und BOM, zum Nachbearbeiten in Excel */
export function rowErrorsToCsv(errors: readonly RowError[]): string {
  const header = ['Zeile', 'Feld', 'Wert', 'Fehler', 'Art'].join(CSV_SEPARATOR);
  const lines = errors.map((e) =>
    [String(e.line), e.field, e.value, e.message, reasonLabel(e.reason)]
      .map(escapeCsvCell)
      .join(CSV_SEPARATOR),
  );
  return CSV_BOM + [header, ...lines].join('\r\n') + '\r\n';
}
