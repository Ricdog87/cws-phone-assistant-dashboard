import type { Lead } from '@/domain/types';
import type { LoadReport } from './providers/types';

/** Zielfelder des CSV-Imports mit deutscher Bezeichnung */
export type CsvTargetField = Exclude<keyof Lead, 'id'> | 'id';

export interface CsvFieldSpec {
  field: CsvTargetField;
  label: string;
  required: boolean;
  kind: 'text' | 'number' | 'boolean';
  /** Spaltennamen, die beim automatischen Vorschlag erkannt werden (klein geschrieben) */
  aliases: string[];
}

export const CSV_FIELDS: CsvFieldSpec[] = [
  {
    field: 'id',
    label: 'ID',
    required: false,
    kind: 'text',
    aliases: ['id', 'lead-id', 'kundennummer'],
  },
  {
    field: 'name',
    label: 'Firmenname',
    required: true,
    kind: 'text',
    aliases: ['name', 'firma', 'firmenname', 'unternehmen', 'company'],
  },
  {
    field: 'industry',
    label: 'Branche',
    required: false,
    kind: 'text',
    aliases: ['branche', 'industry'],
  },
  {
    field: 'street',
    label: 'Straße',
    required: false,
    kind: 'text',
    aliases: ['straße', 'strasse', 'street', 'adresse'],
  },
  {
    field: 'postalCode',
    label: 'PLZ',
    required: false,
    kind: 'text',
    aliases: ['plz', 'postleitzahl', 'postalcode', 'zip'],
  },
  { field: 'city', label: 'Ort', required: false, kind: 'text', aliases: ['ort', 'stadt', 'city'] },
  {
    field: 'lat',
    label: 'Breitengrad',
    required: true,
    kind: 'number',
    aliases: ['lat', 'latitude', 'breitengrad', 'breite'],
  },
  {
    field: 'lng',
    label: 'Längengrad',
    required: true,
    kind: 'number',
    aliases: ['lng', 'lon', 'longitude', 'längengrad', 'laengengrad', 'länge'],
  },
  {
    field: 'commercialEmployees',
    label: 'Gewerbliche Mitarbeitende',
    required: false,
    kind: 'number',
    aliases: ['gewerbliche mitarbeitende', 'gewerbliche ma', 'mitarbeitende', 'employees'],
  },
  {
    field: 'wearerCount',
    label: 'Trägerzahl',
    required: false,
    kind: 'number',
    aliases: ['trägerzahl', 'traegerzahl', 'träger', 'wearers'],
  },
  {
    field: 'phone',
    label: 'Telefon',
    required: false,
    kind: 'text',
    aliases: ['telefon', 'phone', 'tel'],
  },
  {
    field: 'hasDirectDial',
    label: 'Durchwahl bekannt',
    required: false,
    kind: 'boolean',
    aliases: ['durchwahl', 'direct dial'],
  },
  {
    field: 'contactName',
    label: 'Ansprechpartner',
    required: false,
    kind: 'text',
    aliases: ['ansprechpartner', 'kontakt', 'contact'],
  },
  {
    field: 'contactRole',
    label: 'Funktion Ansprechpartner',
    required: false,
    kind: 'text',
    aliases: ['funktion', 'position', 'rolle', 'title'],
  },
  {
    field: 'openPositions',
    label: 'Offene Stellen',
    required: false,
    kind: 'number',
    aliases: ['offene stellen', 'stellen', 'open positions'],
  },
  {
    field: 'certification',
    label: 'Zertifizierung',
    required: false,
    kind: 'text',
    aliases: ['zertifizierung', 'zertifikat', 'certification'],
  },
  {
    field: 'siteExpansion',
    label: 'Standorterweiterung',
    required: false,
    kind: 'boolean',
    aliases: ['standorterweiterung', 'erweiterung'],
  },
  {
    field: 'managementChange',
    label: 'Wechsel Geschäftsführung',
    required: false,
    kind: 'boolean',
    aliases: ['wechsel geschäftsführung', 'gf-wechsel', 'gf wechsel'],
  },
  {
    field: 'isCustomer',
    label: 'Bestandskunde',
    required: false,
    kind: 'boolean',
    aliases: ['bestandskunde', 'kunde', 'customer'],
  },
];

/** Zielfeld auf Quellspalte, leerer Wert heißt nicht zugeordnet */
export type ColumnMapping = Partial<Record<CsvTargetField, string>>;

export function suggestMapping(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const spec of CSV_FIELDS) {
    const match = headers.find((h) => spec.aliases.includes(h.trim().toLowerCase()));
    if (match) mapping[spec.field] = match;
  }
  return mapping;
}

/** Zahlen im deutschen und englischen Format, leere Werte ergeben null */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const normalized = /,\d+$/.test(trimmed) ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseBoolean(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  return ['1', 'ja', 'j', 'x', 'true', 'wahr', 'yes', 'y'].includes(raw.trim().toLowerCase());
}

function text(raw: string | undefined): string {
  return raw?.trim() ?? '';
}

function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  return (
    lat !== null &&
    lng !== null &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export interface CsvMappingResult {
  leads: Lead[];
  report: LoadReport;
}

/** Wandelt CSV-Zeilen anhand der Spaltenzuordnung in Leads um. Zeilen ohne Koordinaten werden verworfen. */
export function mapCsvRows(
  rows: readonly Record<string, string>[],
  mapping: ColumnMapping,
): CsvMappingResult {
  const leads: Lead[] = [];
  let rejectedMissingCoordinates = 0;
  let rejectedOther = 0;

  const get = (row: Record<string, string>, field: CsvTargetField): string | undefined => {
    const column = mapping[field];
    return column ? row[column] : undefined;
  };

  rows.forEach((row, index) => {
    const lat = parseNumber(get(row, 'lat'));
    const lng = parseNumber(get(row, 'lng'));
    if (!isValidCoordinate(lat, lng)) {
      rejectedMissingCoordinates++;
      return;
    }
    const name = text(get(row, 'name'));
    if (name === '') {
      rejectedOther++;
      return;
    }
    const contactName = text(get(row, 'contactName'));
    const contactRole = text(get(row, 'contactRole'));
    const certification = text(get(row, 'certification'));
    leads.push({
      id: text(get(row, 'id')) || `CSV-${String(index + 1).padStart(4, '0')}`,
      name,
      industry: text(get(row, 'industry')),
      street: text(get(row, 'street')),
      postalCode: text(get(row, 'postalCode')),
      city: text(get(row, 'city')),
      lat: lat as number,
      lng: lng as number,
      commercialEmployees: parseNumber(get(row, 'commercialEmployees')) ?? 0,
      wearerCount: parseNumber(get(row, 'wearerCount')) ?? 0,
      phone: text(get(row, 'phone')),
      hasDirectDial: parseBoolean(get(row, 'hasDirectDial')),
      contactName: contactName || null,
      contactRole: contactRole || null,
      openPositions: parseNumber(get(row, 'openPositions')) ?? 0,
      certification: certification || null,
      siteExpansion: parseBoolean(get(row, 'siteExpansion')),
      managementChange: parseBoolean(get(row, 'managementChange')),
      isCustomer: parseBoolean(get(row, 'isCustomer')),
    });
  });

  return {
    leads,
    report: {
      total: rows.length,
      loaded: leads.length,
      rejectedMissingCoordinates,
      rejectedOther,
    },
  };
}
