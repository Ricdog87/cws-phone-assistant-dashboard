import Dexie, { type Table } from 'dexie';
import type { CallOutcome } from '@/domain/types';

/** Ablage der Anrufergebnisse. Austauschbar, etwa gegen einen CRM-Rückkanal. */
export interface OutcomeRepository {
  add(outcome: CallOutcome): Promise<void>;
  list(): Promise<CallOutcome[]>;
  clear(): Promise<void>;
}

class OutcomeDatabase extends Dexie {
  outcomes!: Table<CallOutcome, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      outcomes: 'id, leadId, recordedAt, outcome, band, isControl',
    });
  }
}

export class DexieOutcomeRepository implements OutcomeRepository {
  private readonly db: OutcomeDatabase;

  constructor(databaseName = 'cws-lead-cockpit') {
    this.db = new OutcomeDatabase(databaseName);
  }

  async add(outcome: CallOutcome): Promise<void> {
    await this.db.outcomes.put(outcome);
  }

  async list(): Promise<CallOutcome[]> {
    return this.db.outcomes.orderBy('recordedAt').toArray();
  }

  async clear(): Promise<void> {
    await this.db.outcomes.clear();
  }
}

/** Flüchtige Variante für Tests und als Rückfall, wenn IndexedDB nicht verfügbar ist */
export class InMemoryOutcomeRepository implements OutcomeRepository {
  private items: CallOutcome[] = [];

  async add(outcome: CallOutcome): Promise<void> {
    this.items = [...this.items.filter((o) => o.id !== outcome.id), outcome];
  }

  async list(): Promise<CallOutcome[]> {
    return [...this.items].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
