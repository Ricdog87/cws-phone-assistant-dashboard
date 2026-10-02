import { buildBriefing } from '@/domain/briefing';
import type { QueueEntry } from '@/domain/types';
import type { BriefingGenerator, GeneratedBriefing } from './types';

/** Standard: regelbasiertes Briefing aus den Lead-Merkmalen, ohne Netzwerk */
export class RuleBasedBriefingGenerator implements BriefingGenerator {
  readonly label = 'Regelbasiert';

  build(entry: QueueEntry): GeneratedBriefing {
    const briefing = buildBriefing(entry);
    return {
      hooks: briefing.hooks.map((h) => h.text),
      openingLine: briefing.openingLine,
      objectionHandling: [],
      source: 'rules',
    };
  }

  async generate(entry: QueueEntry): Promise<GeneratedBriefing> {
    return this.build(entry);
  }
}
