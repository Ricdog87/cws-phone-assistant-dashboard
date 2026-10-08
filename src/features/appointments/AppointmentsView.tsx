import { useMemo } from 'react';
import { useGoalProgress, useQueue } from '@/app/selectors';
import { salesforceUrl } from '@/app/services';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { formatInt } from '@/components/format';
import { LINK_PRIMARY, LINK_SECONDARY } from '@/components/linkStyles';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { demoEarlierAppointments } from '@/data/demoAppointments';
import { TEAM_APPOINTMENT_STATUS_LABELS, type TeamAppointment } from '@/domain/appointments';
import { localWeekRange } from '@/domain/goals';
import { calendarUrl } from '@/domain/salesforce';
import type { Lead } from '@/domain/types';
import { useLiveAppointments } from '@/features/dashboard/useRegionBoard';
import { useEventBooking } from '@/features/queue/useEventBooking';

function formatBooked(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Termine der Telefonassistenz: diese Woche aus den erfassten Anrufen, mit Status in
 * Salesforce; noch nicht eingetragene zuerst. Datum und Uhrzeit liegen in Salesforce.
 */
export function AppointmentsView() {
  const live = useLiveAppointments();
  const leads = useAppStore((s) => s.leads);
  const sourceId = useAppStore((s) => s.sourceId);
  const owner = useAppStore((s) => s.ownerFilter);
  const agentName = useAppStore((s) => s.agentName);
  const selectLead = useAppStore((s) => s.selectLead);
  const setTab = useAppStore((s) => s.setTab);
  const goals = useGoalProgress();
  const queue = useQueue();

  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const inQueue = useMemo(() => new Set(queue.map((entry) => entry.lead.id)), [queue]);
  const { from } = localWeekRange();
  const thisWeek = live.filter((row) => new Date(row.bookedAt).getTime() >= from);
  const earlier = useMemo(() => {
    const own = live.filter((row) => new Date(row.bookedAt).getTime() < from);
    const demo =
      sourceId === 'mock' && owner ? demoEarlierAppointments(leads, owner, agentName) : [];
    return [...own, ...demo].sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
  }, [live, from, sourceId, owner, agentName, leads]);
  const open = live.filter((row) => row.status === 'open').length;
  const goal = goals.weeklyAppointmentGoal;

  function openInQueue(leadId: string) {
    selectLead(leadId);
    setTab('queue');
  }

  const rows = (items: readonly TeamAppointment[]) => (
    <ul className="-my-2 divide-y divide-border">
      {items.map((row) => (
        <AppointmentRow
          key={row.id}
          row={row}
          lead={row.leadId ? leadById.get(row.leadId) : undefined}
          callerName={agentName}
          canOpen={row.leadId !== null && inQueue.has(row.leadId)}
          onOpen={() => row.leadId && openInQueue(row.leadId)}
        />
      ))}
    </ul>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Termine</h2>
            <p className="text-sm text-muted">
              Vereinbarte Termine für deinen Hunter. Datum, Uhrzeit und Einladung legst du im
              Salesforce-Kalender an.
            </p>
          </div>
          {salesforceUrl && (
            <a
              href={calendarUrl(salesforceUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_SECONDARY}
            >
              Salesforce-Kalender öffnen
            </a>
          )}
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Diese Woche"
            value={formatInt(goals.week.appointments)}
            suffix={`von ${formatInt(goal)}`}
            fillPercent={(goals.week.appointments / Math.max(1, goal)) * 100}
            fillReached={goals.week.appointments >= goal}
          />
          <StatTile
            label="Noch nicht in Salesforce"
            value={formatInt(open)}
            hint={open > 0 ? 'Bitte direkt eintragen' : 'Alles eingetragen'}
          />
          <StatTile label="Vorwochen" value={formatInt(earlier.length)} hint="Letzte zwei Wochen" />
        </div>

        <Panel title={`Diese Woche (${thisWeek.length})`}>
          {thisWeek.length === 0 ? (
            <p className="text-sm text-muted">
              Noch kein Termin in dieser Woche. In der Anrufliste bucht Taste 1 einen Termin.
            </p>
          ) : (
            rows(thisWeek)
          )}
        </Panel>

        {earlier.length > 0 && (
          <Panel title={`Vorwochen (${earlier.length})`}>{rows(earlier)}</Panel>
        )}
      </div>
    </div>
  );
}

interface AppointmentRowProps {
  row: TeamAppointment;
  lead: Lead | undefined;
  callerName: string;
  canOpen: boolean;
  onOpen(): void;
}

function AppointmentRow({ row, lead, callerName, canOpen, onOpen }: AppointmentRowProps) {
  return (
    <li className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
      <div className="text-xs tabular-nums text-muted">gebucht {formatBooked(row.bookedAt)}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{row.leadName}</div>
        <div className="text-xs text-muted">Hunter {row.hunterName}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-bold ${
            row.status === 'entered'
              ? 'border-border text-muted'
              : 'border-brand-primary text-brand-primary'
          }`}
        >
          {TEAM_APPOINTMENT_STATUS_LABELS[row.status]}
        </span>
        {lead && row.status === 'open' && <EventLink lead={lead} callerName={callerName} />}
        {row.live && (
          <Button onClick={onOpen} disabled={!canOpen}>
            Im Briefing öffnen
          </Button>
        )}
      </div>
    </li>
  );
}

function EventLink({ lead, callerName }: { lead: Lead; callerName: string }) {
  const { eventHref, markOpened } = useEventBooking(lead, callerName);
  if (!eventHref) return null;
  return (
    <a
      href={eventHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={markOpened}
      className={LINK_PRIMARY}
    >
      Termin in Salesforce anlegen
    </a>
  );
}
