import { useCallback } from 'react';
import { useAppStore } from '@/app/store';
import { nextOpenLeadId } from '@/domain/queue';
import { normalizeWeights } from '@/domain/scoring';
import type { CallOutcome, OutcomeType, QueueEntry } from '@/domain/types';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
        distanceKm: entry.distanceKm,
        detourMinutes: entry.detourMinutes,
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
