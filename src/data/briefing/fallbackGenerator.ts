import type { QueueEntry } from '@/domain/types';
import { BriefingError } from './llmGenerator';
import type { RuleBasedBriefingGenerator } from './ruleBasedGenerator';
import type { BriefingGenerator, GeneratedBriefing } from './types';

const REASONS: Record<BriefingError['category'], string> = {
  http: 'Endpunkt nicht verfügbar',
  timeout: 'Zeitüberschreitung',
  invalid_response: 'Antwort entsprach nicht dem Schema',
  network: 'Netzwerkfehler',
  aborted: 'abgebrochen',
};

export type WarnFn = (message: string) => void;

/** Versucht den primären Generator und greift bei jedem Fehler auf die Regeln zurück */
export class FallbackBriefingGenerator implements BriefingGenerator {
  readonly label: string;

  constructor(
    private readonly primary: BriefingGenerator,
    private readonly fallback: RuleBasedBriefingGenerator,
    // Protokolliert nur die Fehlerkategorie, niemals Lead-Daten
    private readonly warn: WarnFn = (message) => console.warn(message),
  ) {
    this.label = primary.label;
  }

  async generate(entry: QueueEntry, signal?: AbortSignal): Promise<GeneratedBriefing> {
    try {
      return await this.primary.generate(entry, signal);
    } catch (error) {
      const reason =
        error instanceof BriefingError ? REASONS[error.category] : 'unbekannter Fehler';
      if (!(error instanceof BriefingError && error.category === 'aborted')) {
        this.warn(`Briefing: regelbasierte Variante aktiv (${reason})`);
      }
      return { ...this.fallback.build(entry), fallbackReason: reason };
    }
  }
}
