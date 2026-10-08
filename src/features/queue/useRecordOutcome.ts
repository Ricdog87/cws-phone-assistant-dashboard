import { useCallback } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { latestContactByLead } from '@/domain/contacts';
import { openCallFor } from '@/domain/openCalls';
import { emptyProtocol, normalizeProtocol } from '@/domain/protocol';
import { nextOpenLeadId } from '@/domain/queue';
import { callLogTask, recallTask } from '@/domain/salesforceSync';
import { normalizeWeights } from '@/domain/scoring';
import type { CallOutcome, CallProtocol, OutcomeType, QueueEntry, Recall } from '@/domain/types';

/** Angaben aus dem Formular Wiedervorlage; die Notiz kommt aus dem Gesprächsprotokoll */
export type RecallDraft = Pick<Recall, 'reason' | 'dueDate' | 'dueTime' | 'contractEnd'>;

export interface RecordOptions {
  /** Gesprächsprotokoll aus der Maske */
  protocol?: CallProtocol;
  /** Wiedervorlage mit Grund und Datum, nur beim Ergebnis callback */
  recall?: RecallDraft;
}

/**
 * Ergebnis mit Gesprächsprotokoll buchen, als Aufgabe „Anruf“ in den Postausgang nach
 * Salesforce stellen und zum nächsten offenen Lead springen. Ist das Protokoll schon
 * gespeichert, übernimmt das Ergebnis dessen ID und ergänzt dieselbe Aufgabe. Eine
 * Wiedervorlage entsteht zusammen mit dem Ergebnis, trägt denselben Zeitpunkt und geht als
 * offene Aufgabe mit.
 */
export function useRecordOutcome(queue: readonly QueueEntry[]) {
  const addOutcome = useAppStore((s) => s.addOutcome);
  const addRecall = useAppStore((s) => s.addRecall);
  const removeOpenCall = useAppStore((s) => s.removeOpenCall);
  const enqueueSync = useAppStore((s) => s.enqueueSync);
  const flushSync = useAppStore((s) => s.flushSync);
  const selectLead = useAppStore((s) => s.selectLead);

  return useCallback(
    async (entry: QueueEntry, outcome: OutcomeType, options: RecordOptions = {}) => {
      const { weights, sourceId, outcomes, contacts, agentName, openCalls } =
        useAppStore.getState();
      const recordedAt = new Date().toISOString();
      const open = openCallFor(openCalls, entry.lead.id);
      const protocol = normalizeProtocol(options.protocol ?? open?.protocol ?? emptyProtocol());
      const record: CallOutcome = {
        id: open?.id ?? newId(),
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
        protocol,
        ...(options.recall ? { recallReason: options.recall.reason } : {}),
      };
      await addOutcome(record);
      if (open) await removeOpenCall(open.id);
      const contact = latestContactByLead(contacts).get(entry.lead.id);
      await enqueueSync(record.id, callLogTask(record, agentName, contact));
      if (options.recall) {
        const recall: Recall = {
          ...options.recall,
          id: newId(),
          leadId: entry.lead.id,
          leadName: entry.lead.name,
          hunterName: entry.lead.owner ?? null,
          note: protocol.note,
          createdAt: recordedAt,
        };
        await addRecall(recall);
        await enqueueSync(recall.id, recallTask(recall, agentName));
      }
      void flushSync();
      const processed = new Set([...outcomes.map((o) => o.leadId), entry.lead.id]);
      selectLead(nextOpenLeadId(queue, entry.lead.id, processed) ?? entry.lead.id);
    },
    [addOutcome, addRecall, removeOpenCall, enqueueSync, flushSync, selectLead, queue],
  );
}
