import type { ColumnMapping } from './csvMapping';
import type { AppDatabase, StoredColumnMapping } from './db';

/** Gespeicherte Spaltenzuordnungen, damit wiederkehrende Exporte nicht neu zugeordnet werden müssen */
export interface ColumnMappingRepository {
  save(headers: readonly string[], mapping: ColumnMapping): Promise<void>;
  /**
   * Vorschlag für eine Kopfzeile: zuerst die Zuordnung derselben Kopfzeile,
   * sonst die zuletzt gespeicherte, reduziert auf vorhandene Spalten.
   */
  find(headers: readonly string[]): Promise<ColumnMapping | null>;
}

export function headerFingerprint(headers: readonly string[]): string {
  return [...headers]
    .map((h) => h.trim().toLowerCase())
    .sort()
    .join('|');
}

/** Behält nur Zuordnungen, deren Quellspalte in der Kopfzeile vorkommt */
export function restrictToHeaders(
  mapping: ColumnMapping,
  headers: readonly string[],
): ColumnMapping {
  const available = new Set(headers);
  return Object.fromEntries(
    Object.entries(mapping).filter(([, column]) => column !== undefined && available.has(column)),
  );
}

function pick(entries: StoredColumnMapping[], headers: readonly string[]): ColumnMapping | null {
  const key = headerFingerprint(headers);
  const exact = entries.find((e) => e.key === key);
  if (exact) return restrictToHeaders(exact.mapping, headers);
  const latest = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!latest) return null;
  const restricted = restrictToHeaders(latest.mapping, headers);
  return Object.keys(restricted).length > 0 ? restricted : null;
}

function entryFor(headers: readonly string[], mapping: ColumnMapping): StoredColumnMapping {
  return {
    key: headerFingerprint(headers),
    headers: [...headers],
    mapping: { ...mapping },
    updatedAt: new Date().toISOString(),
  };
}

export class DexieColumnMappingRepository implements ColumnMappingRepository {
  constructor(private readonly db: AppDatabase) {}

  async save(headers: readonly string[], mapping: ColumnMapping): Promise<void> {
    await this.db.columnMappings.put(entryFor(headers, mapping));
  }

  async find(headers: readonly string[]): Promise<ColumnMapping | null> {
    return pick(await this.db.columnMappings.toArray(), headers);
  }
}

export class InMemoryColumnMappingRepository implements ColumnMappingRepository {
  private entries: StoredColumnMapping[] = [];

  async save(headers: readonly string[], mapping: ColumnMapping): Promise<void> {
    const entry = entryFor(headers, mapping);
    this.entries = [...this.entries.filter((e) => e.key !== entry.key), entry];
  }

  async find(headers: readonly string[]): Promise<ColumnMapping | null> {
    return pick(this.entries, headers);
  }
}
