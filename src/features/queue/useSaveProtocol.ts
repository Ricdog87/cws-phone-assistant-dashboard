import { useCallback } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { latestContactByLead } from '@/domain/contacts';
import { openCallFor } from '@/domain/openCalls';
import { normalizeProtocol } from '@/domain/protocol';
import { callLogTask } from '@/domain/salesforceSync';
import type { CallProtocol, OpenCall, QueueEntry } from '@/domain/types';

/**
 * Gesprächsprotokoll bestätigen: als offenes Gespräch speichern und sofort als Aufgabe
 * „Anruf“ nach Salesforce schicken. Jede weitere Änderung aktualisiert dieselbe Aufgabe.
 */
export function useSaveProtocol() {
  const saveOpenCall = useAppStore((s) => s.saveOpenCall);
  const enqueueSync = useAppStore((s) => s.enqueueSync);
  const flushSync = useAppStore((s) => s.flushSync);

  return useCallback(
    async (entry: QueueEntry, protocol: CallProtocol) => {
      const { openCalls, contacts, agentName } = useAppStore.getState();
      const call: OpenCall = {
        id: openCallFor(openCalls, entry.lead.id)?.id ?? newId(),
        leadId: entry.lead.id,
        leadName: entry.lead.name,
        owner: entry.lead.owner ?? null,
        protocol: normalizeProtocol(protocol),
        savedAt: new Date().toISOString(),
      };
      await saveOpenCall(call);
      const contact = latestContactByLead(contacts).get(entry.lead.id);
      await enqueueSync(
        call.id,
        callLogTask({ ...call, outcome: null, recordedAt: call.savedAt }, agentName, contact),
      );
      void flushSync();
    },
    [saveOpenCall, enqueueSync, flushSync],
  );
}
