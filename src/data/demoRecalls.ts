import { isInCooldown } from '@/domain/activity';
import { suggestRecallDate } from '@/domain/recall';
import type { Lead, Recall } from '@/domain/types';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Heute plus Tage; ein Wochenende rückt in Richtung des Versatzes auf den nächsten Werktag */
function workdayFrom(today: Date, days: number): Date {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const step = days < 0 ? -1 : 1;
  while (days !== 0 && (date.getDay() === 0 || date.getDay() === 6)) {
    date.setDate(date.getDate() + step);
  }
  return date;
}

function monthAhead(today: Date, months: number): string {
  const date = new Date(today.getFullYear(), today.getMonth() + months, 1);
  return isoDate(date).slice(0, 7);
}

interface Template {
  /** Fälligkeit in Tagen ab heute, bei Vertragsende Monate bis zum Vertragsende */
  offset: number;
  reason: Recall['reason'];
  dueTime: string | null;
  note: string | null;
}

const TEMPLATES: readonly Template[] = [
  {
    offset: -2,
    reason: 'callback',
    dueTime: '10:30',
    note: 'Ansprechpartner war im Termin, Rückruf zugesagt',
  },
  {
    offset: -1,
    reason: 'callback',
    dueTime: null,
    note: 'Zentrale: Betriebsleitung ab Mittwoch wieder im Haus',
  },
  {
    offset: 0,
    reason: 'callback',
    dueTime: '09:30',
    note: 'Bitte vor der Frühbesprechung anrufen',
  },
  { offset: 0, reason: 'callback', dueTime: '14:00', note: 'Erst nach 14 Uhr erreichbar' },
  { offset: 1, reason: 'callback', dueTime: '11:00', note: 'Einkauf entscheidet mit' },
  { offset: 3, reason: 'callback', dueTime: null, note: 'Rückruf nach der Budgetrunde' },
  {
    offset: 6,
    reason: 'callback',
    dueTime: '15:30',
    note: 'Interesse an Hygienekleidung, Werksleitung einbinden',
  },
  { offset: 11, reason: 'contractEnd', dueTime: null, note: 'Mietvertrag beim Wettbewerber' },
  {
    offset: 15,
    reason: 'contractEnd',
    dueTime: null,
    note: 'Leasing läuft aus, Vergleich gewünscht',
  },
];

/**
 * Fiktive offene Wiedervorlagen der Live-Assistenz aus früheren Anrufen: Accounts ihres
 * Hunters außerhalb der Sperrfrist, fällig von vorgestern bis in einige Monate.
 */
export function demoRecalls(leads: readonly Lead[], owner: string, today: Date): Recall[] {
  const day = isoDate(today);
  const pool = leads
    .filter((lead) => lead.owner === owner && !lead.isCustomer)
    .filter((lead) => !isInCooldown(lead.lastActivity, day))
    .sort((a, b) => hash(`wv-${a.id}`) - hash(`wv-${b.id}`));
  const recalls: Recall[] = [];
  TEMPLATES.forEach((template, index) => {
    const lead = pool[index];
    if (!lead) return;
    const contractEnd =
      template.reason === 'contractEnd' ? monthAhead(today, template.offset) : null;
    const suggested = contractEnd ? suggestRecallDate(contractEnd, today) : null;
    const dueDate =
      suggested && suggested !== 'bookNow'
        ? suggested
        : isoDate(workdayFrom(today, template.reason === 'callback' ? template.offset : 7));
    // Angelegt beim letzten Anruf, eine bis zwei Wochen vor heute
    const created = workdayFrom(today, -(5 + (hash(lead.id) % 8)));
    created.setHours(8 + (hash(`${lead.id}-h`) % 8), hash(`${lead.id}-m`) % 60);
    recalls.push({
      id: `demo-wv-${lead.id}`,
      leadId: lead.id,
      leadName: lead.name,
      hunterName: owner,
      reason: template.reason,
      dueDate,
      dueTime: template.dueTime,
      contractEnd,
      note: template.note,
      createdAt: created.toISOString(),
      salesforceOpenedAt: index % 3 === 2 ? null : created.toISOString(),
    });
  });
  return recalls;
}
