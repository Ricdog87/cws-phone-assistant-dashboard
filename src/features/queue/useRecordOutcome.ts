import { useCallback } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { nextOpenLeadId } from '@/domain/queue';
import { normalizeWeights } from '@/domain/scoring';
import type { CallOutcome, OutcomeType, QueueEntry, Recall } from '@/domain/types';

/** Angaben aus dem Formular Wiedervorlage */
export type RecallDraft = Pick<Recall, 'reason' | 'dueDate' | 'dueTime' | 'contractEnd' | 'note'>;

export interface RecordOptions {
  /** Wiedervorlage mit Grund und Datum, nur beim Ergebnis callback */
  recall?: RecallDraft;
  /** Der Salesforce-Kalender wurde beim Termin geöffnet */
  salesforceOpened?: boolean;
}

/**
 * Ergebnis buchen und anschließend zum nächsten offenen Lead springen. Eine Wiedervorlage
 * entsteht zusammen mit dem Ergebnis und trägt denselben Zeitpunkt; beim Termin merkt sich
 * das Cockpit, dass der Salesforce-Kalender geöffnet wurde.
 */
export function useRecordOutcome(queue: readonly QueueEntry[]) {
  const addOutcome = useAppStore((s) => s.addOutcome);
  const addRecall = useAppStore((s) => s.addRecall);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const selectLead = useAppStore((s) => s.selectLead);

  return useCallback(
    async (entry: QueueEntry, outcome: OutcomeType, options: RecordOptions = {}) => {
      const { recall, salesforceOpened } = options;
      const { weights, sourceId, outcomes } = useAppStore.getState();
      const recordedAt = new Date().toISOString();
      const record: CallOutcome = {
        id: newId(),
        leadId: entry.lead.id,
        leadName: entry.lead.name,
        outcome,
        recordedAt,
        band: entry.band,
        score: entry.score,
        dimensions: entry.dimensions,
        normalizedWeights: normalizeWeights(weights),
        owner: entry.lead.owner ?? null,
        isControl: entry.isControl,
        queuePosition: entry.position,
        sourceId,
        ...(recall ? { recallReason: recall.reason } : {}),
      };
      await addOutcome(record);
      if (outcome === 'appointment' && salesforceOpened) {
        await addAppointment({
          id: newId(),
          leadId: entry.lead.id,
          leadName: entry.lead.name,
          hunterName: entry.lead.owner ?? null,
          createdAt: recordedAt,
          salesforceOpenedAt: recordedAt,
        });
      }
      if (recall) {
        await addRecall({
          ...recall,
          id: newId(),
          leadId: entry.lead.id,
          leadName: entry.lead.name,
          hunterName: entry.lead.owner ?? null,
          createdAt: recordedAt,
          salesforceOpenedAt: null,
        });
      }
      const processed = new Set([...outcomes.map((o) => o.leadId), entry.lead.id]);
      selectLead(nextOpenLeadId(queue, entry.lead.id, processed) ?? entry.lead.id);
    },
    [addOutcome, addRecall, addAppointment, selectLead, queue],
  );
}
