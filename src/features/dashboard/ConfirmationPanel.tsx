import { useState } from 'react';
import { Button } from '@/components/Button';
import { formatInt } from '@/components/format';
import { TEAM_APPOINTMENT_STATUS_LABELS, type TeamAppointment } from '@/domain/appointments';
import { LiveTag } from './AssistantBrick';

const COLLAPSED_ROWS = 6;

const STATUS_CLASS: Record<TeamAppointment['status'], string> = {
  confirmed: 'border-border text-muted',
  open: 'border-brand-primary text-brand-primary',
  details_missing: 'border-brand-primary bg-brand-primary text-on-primary',
};

function formatStart(iso: string | null): string {
  if (!iso) return 'Datum fehlt';
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
  /** Ohne Spalte Telefonassistenz, etwa in der eigenen Ansicht */
  hideAssistant?: boolean;
  /** Öffnet einen Live-Termin in der Anrufliste */
  onOpen?(leadId: string): void;
}

/** Terminbestätigungen der Woche: offene zuerst, bestätigte danach */
export function ConfirmationPanel({ appointments, hideAssistant, onOpen }: ConfirmationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
  const open = appointments.length - confirmed;
  const visible = expanded ? appointments : appointments.slice(0, COLLAPSED_ROWS);

  return (
    <section aria-label="Terminbestätigungen" className="rounded-lg border border-border bg-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm">
          <strong className="tabular-nums">{formatInt(confirmed)}</strong> von{' '}
          <span className="tabular-nums">{formatInt(appointments.length)}</span> Terminen bestätigt
        </p>
        <p className={`text-sm font-bold ${open > 0 ? 'text-brand-primary' : 'text-muted'}`}>
          {open > 0 ? `${formatInt(open)} offen` : 'Alles bestätigt'}
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
                  {formatStart(appointment.start)}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted">
                  Hunter {appointment.hunterName}
                  {!hideAssistant && ` · gebucht von ${appointment.assistantName}`}
                </span>
                {onOpen &&
                  appointment.live &&
                  appointment.leadId &&
                  appointment.status !== 'confirmed' && (
                    <Button onClick={() => onOpen(appointment.leadId ?? '')}>Bestätigen</Button>
                  )}
              </div>
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
