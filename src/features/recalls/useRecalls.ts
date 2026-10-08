import { useMemo } from 'react';
import { todayLocal, useLatestOutcomes } from '@/app/selectors';
import { salesforceUrl } from '@/app/services';
import { useAppStore } from '@/app/store';
import { demoRecalls } from '@/data/demoRecalls';
import { openRecalls, taskDescription, taskSubject } from '@/domain/recall';
import { newTaskUrl, tasksUrl } from '@/domain/salesforce';
import type { Recall } from '@/domain/types';

/**
 * Offene Wiedervorlagen der angemeldeten Telefonassistenz, nach Fälligkeit sortiert. Mit
 * Demo-Daten kommen fiktive Wiedervorlagen aus früheren Anrufen dazu.
 */
export function useOpenRecalls(): Recall[] {
  const recalls = useAppStore((s) => s.recalls);
  const leads = useAppStore((s) => s.leads);
  const sourceId = useAppStore((s) => s.sourceId);
  const owner = useAppStore((s) => s.ownerFilter);
  const latest = useLatestOutcomes();
  const today = todayLocal();
  return useMemo(() => {
    const stored = new Set(recalls.map((recall) => recall.id));
    const demo =
      sourceId === 'mock' && owner
        ? demoRecalls(leads, owner, new Date(`${today}T12:00:00`)).filter(
            (recall) => !stored.has(recall.id),
          )
        : [];
    return openRecalls([...demo, ...recalls], latest);
  }, [recalls, leads, sourceId, owner, latest, today]);
}

/** Offene Wiedervorlage zu einem Lead */
export function useOpenRecall(leadId: string): Recall | undefined {
  const open = useOpenRecalls();
  return useMemo(() => open.find((recall) => recall.leadId === leadId), [open, leadId]);
}

export interface TaskLink {
  /** Formular „Neue Aufgabe“ in Salesforce, null ohne hinterlegte Adresse */
  href: string | null;
  /** Aufgabenliste in Salesforce */
  listHref: string | null;
  markOpened(): void;
}

/** Aufgabe zur Wiedervorlage in Salesforce mit Fälligkeit, Betreff und Notiz */
export function useTaskLink(recall: Recall, base: string | null = salesforceUrl): TaskLink {
  const agentName = useAppStore((s) => s.agentName);
  const addRecall = useAppStore((s) => s.addRecall);
  return {
    href: base
      ? newTaskUrl(base, {
          subject: taskSubject(recall.leadName),
          recordId: recall.leadId,
          dueDate: recall.dueDate,
          description: taskDescription({
            assistantName: agentName,
            hunterName: recall.hunterName,
            reason: recall.reason,
            dueTime: recall.dueTime,
            contractEnd: recall.contractEnd,
            note: recall.note,
          }),
        })
      : null,
    listHref: base ? tasksUrl(base) : null,
    markOpened: () => void addRecall({ ...recall, salesforceOpenedAt: new Date().toISOString() }),
  };
}
