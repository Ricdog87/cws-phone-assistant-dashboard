import type { Recall } from '@/domain/types';
import { AppDatabase } from './db';

/** Ablage der Wiedervorlagen bis zum Rückweg nach Salesforce */
export interface RecallRepository {
  add(recall: Recall): Promise<void>;
  list(): Promise<Recall[]>;
  clear(): Promise<void>;
}

export class DexieRecallRepository implements RecallRepository {
  constructor(private readonly db: AppDatabase = new AppDatabase()) {}

  async add(recall: Recall): Promise<void> {
    await this.db.recalls.put(recall);
  }

  async list(): Promise<Recall[]> {
    return this.db.recalls.orderBy('createdAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.recalls.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemoryRecallRepository implements RecallRepository {
  private items: Recall[] = [];

  async add(recall: Recall): Promise<void> {
    this.items = [...this.items.filter((item) => item.id !== recall.id), recall];
  }

  async list(): Promise<Recall[]> {
    return [...this.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
