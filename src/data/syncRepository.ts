import type { SyncItem } from '@/domain/salesforceSync';
import { AppDatabase } from './db';

/** Postausgang nach Salesforce: je Anrufergebnis oder Wiedervorlage ein Eintrag mit Status */
export interface SyncRepository {
  put(item: SyncItem): Promise<void>;
  list(): Promise<SyncItem[]>;
  clear(): Promise<void>;
}

export class DexieSyncRepository implements SyncRepository {
  constructor(private readonly db: AppDatabase = new AppDatabase()) {}

  async put(item: SyncItem): Promise<void> {
    await this.db.syncItems.put(item);
  }

  async list(): Promise<SyncItem[]> {
    return this.db.syncItems.orderBy('updatedAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.syncItems.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemorySyncRepository implements SyncRepository {
  private items: SyncItem[] = [];

  async put(item: SyncItem): Promise<void> {
    this.items = [...this.items.filter((entry) => entry.id !== item.id), item];
  }

  async list(): Promise<SyncItem[]> {
    return [...this.items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
