import type { Lead } from '@/domain/types';

export type ProviderId = 'mock' | 'csv' | 'clay' | 'dnb' | 'salesforce';

/** Einheitliche Schnittstelle aller Datenquellen */
export interface LeadProvider {
  readonly id: ProviderId;
  readonly label: string;
  load(): Promise<Lead[]>;
}

/** Ergebnis eines Ladevorgangs für die Anzeige im Reiter Daten */
export interface LoadReport {
  total: number;
  loaded: number;
  rejectedMissingCoordinates: number;
  rejectedOther: number;
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
