import type { Lead } from '@/domain/types';

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
    required: false,
    kind: 'number',
    aliases: ['lat', 'latitude', 'breitengrad', 'breite'],
  },
  {
    field: 'lng',
    label: 'Längengrad',
    required: false,
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
    aliases: ['bestandskunde', 'ist kunde', 'existing customer'],
  },
];

/** Zielfeld auf Quellspalte, leerer Wert heißt nicht zugeordnet */
export type ColumnMapping = Partial<Record<CsvTargetField, string>>;

/** Vorschlag aus den Spaltennamen. Jede Quellspalte wird höchstens einem Zielfeld zugeordnet. */
export function suggestMapping(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const spec of CSV_FIELDS) {
    const match = headers.find(
      (h) => !used.has(h) && spec.aliases.includes(h.trim().toLowerCase()),
    );
    if (match) {
      mapping[spec.field] = match;
      used.add(match);
    }
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

export const TRUE_VALUES = ['1', 'ja', 'j', 'x', 'true', 'wahr', 'yes', 'y'];
export const FALSE_VALUES = ['0', 'nein', 'n', 'false', 'falsch', 'no', '-'];

/** Ja/Nein-Wert, leer ergibt nein, unbekannte Werte ergeben null */
export function parseBoolean(raw: string | undefined): boolean | null {
  const value = raw?.trim().toLowerCase() ?? '';
  if (value === '') return false;
  if (TRUE_VALUES.includes(value)) return true;
  if (FALSE_VALUES.includes(value)) return false;
  return null;
}

export function fieldLabel(field: CsvTargetField): string {
  return CSV_FIELDS.find((f) => f.field === field)?.label ?? field;
}

/** Prüft, ob die Zuordnung für einen Import ausreicht. Liefert Hinweise für die Oberfläche. */
export function mappingProblems(mapping: ColumnMapping): string[] {
  const problems: string[] = [];
  if (!mapping.name) problems.push('Firmenname ist nicht zugeordnet.');
  const hasCoordinates = Boolean(mapping.lat && mapping.lng);
  const hasAddress = Boolean(mapping.city || mapping.postalCode);
  if (!hasCoordinates && !hasAddress) {
    problems.push('Weder Breiten- und Längengrad noch Ort oder PLZ sind zugeordnet.');
  }
  if (Boolean(mapping.lat) !== Boolean(mapping.lng)) {
    problems.push('Breiten- und Längengrad nur gemeinsam zuordnen.');
  }
  return problems;
}
