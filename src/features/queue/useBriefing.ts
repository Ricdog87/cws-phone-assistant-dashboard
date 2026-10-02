import { useEffect, useMemo, useState } from 'react';
import { llmBriefing, ruleBasedBriefing } from '@/app/services';
import { useAppStore } from '@/app/store';
import type { GeneratedBriefing } from '@/data/briefing/types';
import type { QueueEntry } from '@/domain/types';

/** Wartezeit, bevor beim schnellen Blättern ein Modellaufruf startet */
export const BRIEFING_DEBOUNCE_MS = 400;

export interface BriefingState {
  briefing: GeneratedBriefing;
  pending: boolean;
}

/**
 * Liefert sofort das regelbasierte Briefing. Ist das Sprachmodell aktiv, wird es
 * nach kurzer Pause nachgeladen und ersetzt die Regeln, sobald es vorliegt.
 */
export function useBriefing(entry: QueueEntry): BriefingState {
  const mode = useAppStore((s) => s.briefingMode);
  const rules = useMemo(() => ruleBasedBriefing.build(entry), [entry]);
  const [result, setResult] = useState<{ entry: QueueEntry; briefing: GeneratedBriefing } | null>(
    null,
  );

  useEffect(() => {
    if (mode !== 'llm') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void llmBriefing.generate(entry, controller.signal).then((briefing) => {
        if (!controller.signal.aborted) setResult({ entry, briefing });
      });
    }, BRIEFING_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [entry, mode]);

  if (mode !== 'llm') return { briefing: rules, pending: false };
  if (result?.entry === entry) return { briefing: result.briefing, pending: false };
  return { briefing: rules, pending: true };
}
