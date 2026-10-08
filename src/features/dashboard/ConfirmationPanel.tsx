import { useState } from 'react';
import { formatInt } from '@/components/format';
import { TEAM_APPOINTMENT_STATUS_LABELS, type TeamAppointment } from '@/domain/appointments';
import { LiveTag } from './AssistantBrick';

const COLLAPSED_ROWS = 6;

const STATUS_CLASS: Record<TeamAppointment['status'], string> = {
  entered: 'border-border text-muted',
  open: 'border-brand-primary text-brand-primary',
};

function formatBooked(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ConfirmationPanelProps {
  appointments: readonly TeamAppointment[];
}

/** Gebuchte Termine der Woche: noch nicht in Salesforce eingetragene zuerst */
export function ConfirmationPanel({ appointments }: ConfirmationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const entered = appointments.filter((a) => a.status === 'entered').length;
  const open = appointments.length - entered;
  const visible = expanded ? appointments : appointments.slice(0, COLLAPSED_ROWS);

  return (
    <section
      aria-label="Termine in Salesforce"
      className="rounded-lg border border-border bg-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm">
          <strong className="tabular-nums">{formatInt(entered)}</strong> von{' '}
          <span className="tabular-nums">{formatInt(appointments.length)}</span> Terminen in
          Salesforce eingetragen
        </p>
        <p className={`text-sm font-bold ${open > 0 ? 'text-brand-primary' : 'text-muted'}`}>
          {open > 0 ? `${formatInt(open)} offen` : 'Alles eingetragen'}
        </p>
      </div>
      {appointments.length === 0 ? (
        <p className="p-4 text-sm text-muted">Noch keine Termine in dieser Woche.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((appointment) => (
            <li key={appointment.id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted">
                  gebucht {formatBooked(appointment.bookedAt)}
                </span>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[appointment.status]}`}
                >
                  {TEAM_APPOINTMENT_STATUS_LABELS[appointment.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-bold leading-snug">
                  {appointment.leadName}
                </span>
                {appointment.live && <LiveTag />}
              </div>
              <span className="block text-xs text-muted">
                Hunter {appointment.hunterName} · gebucht von {appointment.assistantName}
              </span>
            </li>
          ))}
        </ul>
      )}
      {appointments.length > COLLAPSED_ROWS && (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold underline"
          >
            {expanded ? 'Weniger anzeigen' : `Alle ${formatInt(appointments.length)} anzeigen`}
          </button>
        </div>
      )}
    </section>
  );
}
