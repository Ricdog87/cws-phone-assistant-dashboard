import type { Lead } from '@/domain/types';

export type ProviderId = 'mock' | 'csv' | 'clay' | 'dnb' | 'salesforce';

/** Einheitliche Schnittstelle aller Datenquellen */
export interface LeadProvider {
  readonly id: ProviderId;
  readonly label: string;
  load(): Promise<Lead[]>;
}

export type RejectReason = 'invalid' | 'missing_coordinates' | 'geocode_failed';

/** Ein Fehler in einer Importzeile. line ist die Zeilennummer in der Datei, Kopfzeile = 1. */
export interface RowError {
  line: number;
  field: string;
  value: string;
  message: string;
  reason: RejectReason;
}

/** Ergebnis eines Ladevorgangs für die Anzeige im Reiter Daten */
export interface LoadReport {
  total: number;
  loaded: number;
  /** Davon über den Geocoder ergänzte Koordinaten */
  geocoded: number;
  /** Zeilen ohne Koordinaten, die auch nicht nachgeschlagen werden konnten */
  rejectedMissingCoordinates: number;
  /** Zeilen mit Validierungsfehlern */
  rejectedInvalid: number;
  rowErrors: RowError[];
}

export function emptyReport(count: number): LoadReport {
  return {
    total: count,
    loaded: count,
    geocoded: 0,
    rejectedMissingCoordinates: 0,
    rejectedInvalid: 0,
    rowErrors: [],
  };
}

export class NotImplementedError extends Error {
  constructor(providerLabel: string) {
    super(`Die Datenquelle ${providerLabel} ist noch nicht angebunden.`);
    this.name = 'NotImplementedError';
  }
}

/**
 * Zuordnung eines Lead-Felds zu einem Quellfeld. null bedeutet: in der Quelle
 * nicht vorhanden, muss abgeleitet oder manuell ergänzt werden.
 */
export type FieldMapping = Record<keyof Lead, string | null>;
