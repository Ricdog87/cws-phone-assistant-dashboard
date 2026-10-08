import { useCallback } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { nextOpenLeadId } from '@/domain/queue';
import { normalizeWeights } from '@/domain/scoring';
import type { CallOutcome, OutcomeType, QueueEntry } from '@/domain/types';

/** Ergebnis buchen und anschließend zum nächsten offenen Lead springen */
export function useRecordOutcome(queue: readonly QueueEntry[]) {
  const addOutcome = useAppStore((s) => s.addOutcome);
  const selectLead = useAppStore((s) => s.selectLead);

  return useCallback(
    async (entry: QueueEntry, outcome: OutcomeType) => {
      const { weights, sourceId, outcomes } = useAppStore.getState();
      const record: CallOutcome = {
        id: newId(),
        leadId: entry.lead.id,
        leadName: entry.lead.name,
        outcome,
        recordedAt: new Date().toISOString(),
        band: entry.band,
        score: entry.score,
        dimensions: entry.dimensions,
        normalizedWeights: normalizeWeights(weights),
        owner: entry.lead.owner ?? null,
        isControl: entry.isControl,
        queuePosition: entry.position,
        sourceId,
      };
      await addOutcome(record);
      const processed = new Set([...outcomes.map((o) => o.leadId), entry.lead.id]);
      selectLead(nextOpenLeadId(queue, entry.lead.id, processed) ?? entry.lead.id);
    },
    [addOutcome, selectLead, queue],
  );
}
