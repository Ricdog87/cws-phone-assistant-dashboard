import { formatInt } from '@/components/format';
import { TEAM_APPOINTMENT_STATUS_LABELS, type TeamAppointment } from '@/domain/appointments';
import { LiveTag } from './AssistantBrick';

export type AppointmentFilter = 'all' | TeamAppointment['status'];

const FILTERS: { id: AppointmentFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Noch nicht in Salesforce' },
  { id: 'entered', label: 'Eingetragen' },
];

function formatBooked(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Filter über der Terminliste: alle, noch nicht eingetragen, eingetragen */
export function AppointmentFilterSwitch({
  appointments,
  filter,
  onChange,
}: {
  appointments: readonly TeamAppointment[];
  filter: AppointmentFilter;
  onChange(filter: AppointmentFilter): void;
}) {
  const count = (id: AppointmentFilter) =>
    id === 'all' ? appointments.length : appointments.filter((a) => a.status === id).length;
  return (
    <div role="group" aria-label="Termine filtern" className="flex flex-wrap gap-1">
      {FILTERS.map((item) => {
        const active = item.id === filter;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              active
                ? 'border-brand-ink bg-brand-ink text-on-primary'
                : 'border-border text-brand-ink hover:border-brand-ink'
            }`}
          >
            {item.label} <span className="tabular-nums">{formatInt(count(item.id))}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Termine dieser Woche mit Status in Salesforce, noch nicht eingetragene zuerst */
export function TeamAppointmentsTable({
  appointments,
  filter,
}: {
  appointments: readonly TeamAppointment[];
  filter: AppointmentFilter;
}) {
  const rows =
    filter === 'all' ? appointments : appointments.filter((item) => item.status === filter);
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">Keine Termine in dieser Auswahl.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Gebucht
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Firma
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Hunter
            </th>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Telefonassistenz
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-normal">
              Salesforce
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface">
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted">
                {formatBooked(row.bookedAt)}
              </td>
              <td className="px-4 py-2.5 font-bold">{row.leadName}</td>
              <td className="px-4 py-2.5">{row.hunterName}</td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-2">
                  {row.assistantName}
                  {row.live && <LiveTag />}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <span
                  className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-bold ${
                    row.status === 'open'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-border text-muted'
                  }`}
                >
                  {TEAM_APPOINTMENT_STATUS_LABELS[row.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
