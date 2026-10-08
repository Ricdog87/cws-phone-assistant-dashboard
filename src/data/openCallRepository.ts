import type { OpenCall } from '@/domain/types';
import { AppDatabase } from './db';

/** Gespräche mit gespeichertem Protokoll, bis das Ergebnis gebucht ist */
export interface OpenCallRepository {
  put(call: OpenCall): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<OpenCall[]>;
  clear(): Promise<void>;
}

export class DexieOpenCallRepository implements OpenCallRepository {
  constructor(private readonly db: AppDatabase = new AppDatabase()) {}

  async put(call: OpenCall): Promise<void> {
    await this.db.openCalls.put(call);
  }

  async remove(id: string): Promise<void> {
    await this.db.openCalls.delete(id);
  }

  async list(): Promise<OpenCall[]> {
    return this.db.openCalls.orderBy('savedAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.openCalls.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemoryOpenCallRepository implements OpenCallRepository {
  private calls: OpenCall[] = [];

  async put(call: OpenCall): Promise<void> {
    this.calls = [...this.calls.filter((entry) => entry.id !== call.id), call];
  }

  async remove(id: string): Promise<void> {
    this.calls = this.calls.filter((entry) => entry.id !== id);
  }

  async list(): Promise<OpenCall[]> {
    return [...this.calls].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  }

  async clear(): Promise<void> {
    this.calls = [];
  }
}
