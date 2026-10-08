import type { Lead } from '@/domain/types';

/** Zielfelder des CSV-Imports mit deutscher Bezeichnung */
export type CsvTargetField = Exclude<keyof Lead, 'id'> | 'id';

export interface CsvFieldSpec {
  field: CsvTargetField;
  label: string;
  required: boolean;
  kind: 'text' | 'number' | 'boolean' | 'date';
  /**
   * Spaltennamen, die beim automatischen Vorschlag erkannt werden (klein geschrieben).
   * Die Reihenfolge ist die Priorität, etwa Lieferanschrift vor Rechnungsanschrift,
   * weil die Rechnungsanschrift oft die Zentrale und nicht der Standort ist.
   */
  aliases: string[];
}

export const CSV_FIELDS: CsvFieldSpec[] = [
  {
    field: 'id',
    label: 'ID',
    required: false,
    kind: 'text',
    aliases: ['id', 'lead-id', 'account-id', 'account id', 'accountid', 'kundennummer'],
  },
  {
    field: 'name',
    label: 'Firmenname',
    required: true,
    kind: 'text',
    aliases: [
      'name',
      'firma',
      'firmenname',
      'unternehmen',
      'company',
      'accountname',
      'account name',
    ],
  },
  {
    field: 'industry',
    label: 'Branche',
    required: false,
    kind: 'text',
    aliases: ['branche', 'industry', 'branchenebene 2', 'branchenebene 1'],
  },
  {
    field: 'street',
    label: 'Straße',
    required: false,
    kind: 'text',
    aliases: [
      'straße',
      'strasse',
      'street',
      'adresse',
      'straße (lieferanschrift)',
      'straße (rechnungsanschrift)',
    ],
  },
  {
    field: 'postalCode',
    label: 'PLZ',
    required: false,
    kind: 'text',
    aliases: [
      'plz',
      'postleitzahl',
      'postalcode',
      'zip',
      'plz (lieferanschrift)',
      'plz (rechnungsanschrift)',
    ],
  },
  {
    field: 'city',
    label: 'Ort',
    required: false,
    kind: 'text',
    aliases: [
      'ort',
      'stadt',
      'city',
      'ort (lieferanschrift)',
      'stadt (lieferanschrift)',
      'ort (rechnungsanschrift)',
      'stadt (rechnungsanschrift)',
    ],
  },
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
    aliases: [
      'gewerbliche mitarbeitende',
      'gewerbliche ma',
      'mitarbeitende',
      'mitarbeiter',
      'anzahl mitarbeiter',
      'employees',
    ],
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
  {
    field: 'owner',
    label: 'Hunter (Accountinhaber)',
    required: false,
    kind: 'text',
    aliases: [
      'accountinhaber',
      'account owner',
      'inhaber',
      'hunter',
      'lead-inhaber',
      'leadinhaber',
    ],
  },
  {
    field: 'lastActivity',
    label: 'Letzte Aktivität',
    required: false,
    kind: 'date',
    aliases: ['letzte aktivität', 'letzte aktivitaet', 'last activity', 'last activity date'],
  },
];

/** Zielfeld auf Quellspalte, leerer Wert heißt nicht zugeordnet */
export type ColumnMapping = Partial<Record<CsvTargetField, string>>;

/** Vorschlag aus den Spaltennamen. Jede Quellspalte wird höchstens einem Zielfeld zugeordnet. */
export function suggestMapping(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const spec of CSV_FIELDS) {
    for (const alias of spec.aliases) {
      const match = headers.find((h) => !used.has(h) && h.trim().toLowerCase() === alias);
      if (match) {
        mapping[spec.field] = match;
        used.add(match);
        break;
      }
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
  if (Boolean(mapping.lat) !== Boolean(mapping.lng)) {
    problems.push('Breiten- und Längengrad nur gemeinsam zuordnen.');
  }
  return problems;
}
