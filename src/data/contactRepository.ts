import type { ContactUpdate } from '@/domain/types';
import { AppDatabase } from './db';

/** Ablage der im Gespräch erfassten Kontakte bis zum Rückweg nach Salesforce */
export interface ContactRepository {
  add(contact: ContactUpdate): Promise<void>;
  list(): Promise<ContactUpdate[]>;
  clear(): Promise<void>;
}

export class DexieContactRepository implements ContactRepository {
  constructor(private readonly db: AppDatabase = new AppDatabase()) {}

  async add(contact: ContactUpdate): Promise<void> {
    await this.db.contacts.put(contact);
  }

  async list(): Promise<ContactUpdate[]> {
    return this.db.contacts.orderBy('capturedAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.contacts.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemoryContactRepository implements ContactRepository {
  private items: ContactUpdate[] = [];

  async add(contact: ContactUpdate): Promise<void> {
    this.items = [...this.items.filter((c) => c.id !== contact.id), contact];
  }

  async list(): Promise<ContactUpdate[]> {
    return [...this.items].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
