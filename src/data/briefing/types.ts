import type { QueueEntry } from '@/domain/types';

export type BriefingSource = 'rules' | 'llm';

/** Einheitliches Briefing, egal welcher Generator es erzeugt hat */
export interface GeneratedBriefing {
  hooks: string[];
  openingLine: string;
  objectionHandling: string[];
  source: BriefingSource;
  /** Gesetzt, wenn statt des Sprachmodells die Regeln gegriffen haben. Enthält keine Lead-Daten. */
  fallbackReason?: string;
}

/** Austauschbarer Briefing-Generator */
export interface BriefingGenerator {
  readonly label: string;
  generate(entry: QueueEntry, signal?: AbortSignal): Promise<GeneratedBriefing>;
}
