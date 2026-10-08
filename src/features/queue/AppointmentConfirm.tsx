import { useMemo, useState, type FormEvent } from 'react';
import { newId } from '@/app/ids';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { downloadText } from '@/components/download';
import { hunterByName } from '@/data/hunters';
import {
  APPOINTMENT_ERROR_LABELS,
  APPOINTMENT_MINUTE_OPTIONS,
  DEFAULT_APPOINTMENT_MINUTES,
  DEFAULT_APPOINTMENT_TIME,
  buildConfirmationMail,
  buildIcs,
  formatSlot,
  latestAppointmentByLead,
  mailtoHref,
  nextWorkday,
  toAppointment,
  validateAppointmentDraft,
  type AppointmentDraft,
  type AppointmentDraftError,
  type LocalSlot,
} from '@/domain/appointments';
import { latestContactByLead } from '@/domain/contacts';
import type { Lead } from '@/domain/types';

interface AppointmentConfirmProps {
  lead: Lead;
  /** Name der Telefonassistenz für die Signatur */
  callerName: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Ortszeit als YYYY-MM-DDTHH:MM */
function localStamp(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toLocalSlot(iso: string): LocalSlot {
  const [date = '', time = ''] = localStamp(new Date(iso)).split('T');
  return { date, time };
}

const FIELD_CLASS = 'w-full rounded border border-border bg-panel px-2 py-1';

/** Termin festhalten und dem Kunden bestätigen: E-Mail im Mailprogramm und Kalendereintrag */
export function AppointmentConfirm({ lead, callerName }: AppointmentConfirmProps) {
  const contacts = useAppStore((s) => s.contacts);
  const appointments = useAppStore((s) => s.appointments);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const saved = useMemo(
    () => latestAppointmentByLead(appointments).get(lead.id),
    [appointments, lead.id],
  );
  const contact = useMemo(() => latestContactByLead(contacts).get(lead.id), [contacts, lead.id]);
  // Termin geht an den Accountinhaber; E-Mail nur, wenn der Hunter im Verzeichnis steht
  const hunter = hunterByName(lead.owner);

  const [editing, setEditing] = useState(!saved);
  const [draft, setDraft] = useState<AppointmentDraft>(() => ({
    date: nextWorkday(localStamp().slice(0, 10)),
    time: DEFAULT_APPOINTMENT_TIME,
    durationMinutes: DEFAULT_APPOINTMENT_MINUTES,
    hunterName: lead.owner ?? '',
    hunterEmail: hunter?.email ?? '',
    contactName: contact?.name ?? lead.contactName ?? '',
    contactEmail: contact?.email ?? '',
  }));
  const [error, setError] = useState<AppointmentDraftError | null>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof AppointmentDraft>(key: K, value: AppointmentDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validateAppointmentDraft(draft, localStamp());
    setError(problem);
    if (problem || saving) return;
    setSaving(true);
    try {
      const start = new Date(`${draft.date}T${draft.time}:00`).toISOString();
      const location = `${lead.street}, ${lead.postalCode} ${lead.city}`;
      await addAppointment(
        toAppointment(
          draft,
          { id: lead.id, name: lead.name, location },
          start,
          newId(),
          new Date().toISOString(),
        ),
      );
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const slot = saved ? toLocalSlot(saved.start) : null;
  const mail = saved && slot ? buildConfirmationMail(saved, slot, callerName) : null;

  return (
    <section
      aria-label="Termin bestätigen"
      className="rounded border-2 border-brand-primary bg-panel p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Termin bestätigen</h3>
        {saved && !editing && <Button onClick={() => setEditing(true)}>Ändern</Button>}
      </div>

      {saved && slot && mail && !editing && (
        <div className="mt-2 space-y-3">
          {saved.confirmationOpenedAt && (
            <p className="text-xs font-bold text-muted">
              Bestätigung erstellt am {new Date(saved.confirmationOpenedAt).toLocaleString('de-DE')}
            </p>
          )}
          <p className="text-sm">
            <strong>{formatSlot(slot)}</strong> · {saved.durationMinutes} Min. · {saved.hunterName}
            {saved.contactEmail ? (
              <span className="text-muted"> · an {saved.contactEmail}</span>
            ) : (
              <span className="text-muted"> · ohne E-Mail-Adresse des Kunden</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={mailtoHref(saved.contactEmail, saved.hunterEmail, mail)}
              onClick={() =>
                void addAppointment({ ...saved, confirmationOpenedAt: new Date().toISOString() })
              }
              className="rounded border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-bold text-on-primary"
            >
              Bestätigung in Outlook öffnen
            </a>
            <Button
              onClick={() =>
                downloadText(
                  buildIcs(saved, new Date().toISOString()),
                  `termin-${slot.date}.ics`,
                  'text/calendar;charset=utf-8',
                )
              }
            >
              Kalendereintrag (.ics)
            </Button>
          </div>
          <p className="text-xs text-muted">
            Öffnet eine fertige E-Mail im Standard-Mailprogramm, der Hunter steht in Kopie. Der
            Kalendereintrag lässt sich in Outlook öffnen oder an die E-Mail anhängen.
          </p>
        </div>
      )}

      {editing && (
        <form onSubmit={(e) => void save(e)} noValidate className="mt-3 space-y-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Datum</span>
              <input
                id="appointment-date"
                type="date"
                value={draft.date}
                onChange={(e) => update('date', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Uhrzeit</span>
              <input
                id="appointment-time"
                type="time"
                value={draft.time}
                onChange={(e) => update('time', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Dauer</span>
              <select
                id="appointment-duration"
                value={draft.durationMinutes}
                onChange={(e) => update('durationMinutes', Number(e.target.value))}
                className={FIELD_CLASS}
              >
                {APPOINTMENT_MINUTE_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} Minuten
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Hunter</span>
              <input
                id="appointment-hunter"
                value={draft.hunterName}
                onChange={(e) => update('hunterName', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">E-Mail Hunter</span>
              <input
                id="appointment-hunter-email"
                type="email"
                value={draft.hunterEmail}
                onChange={(e) => update('hunterEmail', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">Ansprechpartner</span>
              <input
                id="appointment-contact"
                value={draft.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">E-Mail Ansprechpartner</span>
              <input
                id="appointment-contact-email"
                type="email"
                value={draft.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                className={FIELD_CLASS}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-sm font-bold text-brand-primary">
              {APPOINTMENT_ERROR_LABELS[error]}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Termin speichern
            </Button>
            {saved && <Button onClick={() => setEditing(false)}>Abbrechen</Button>}
          </div>
        </form>
      )}
    </section>
  );
}
