import Dexie, { type Table } from 'dexie';
import type { CallOutcome, ContactUpdate } from '@/domain/types';
import type { ColumnMapping } from './csvMapping';

export interface StoredColumnMapping {
  /** Fingerabdruck der Kopfzeile, siehe headerFingerprint */
  key: string;
  headers: string[];
  mapping: ColumnMapping;
  updatedAt: string;
}

export interface GeocodeCacheEntry {
  /** Normalisierte Adresse */
  key: string;
  found: boolean;
  lat: number | null;
  lng: number | null;
  label: string | null;
  cachedAt: string;
}

/** Lokale Datenbank der Anwendung. Neue Tabellen immer über eine neue Version ergänzen. */
export class AppDatabase extends Dexie {
  outcomes!: Table<CallOutcome, string>;
  columnMappings!: Table<StoredColumnMapping, string>;
  geocodeCache!: Table<GeocodeCacheEntry, string>;
  contacts!: Table<ContactUpdate, string>;

  constructor(name = 'cws-lead-cockpit') {
    super(name);
    this.version(1).stores({
      outcomes: 'id, leadId, recordedAt, outcome, band, isControl',
    });
    this.version(2).stores({
      columnMappings: 'key, updatedAt',
      geocodeCache: 'key, cachedAt',
    });
    this.version(3).stores({
      contacts: 'id, leadId, capturedAt',
    });
  }
}
