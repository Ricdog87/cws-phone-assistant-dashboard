import { todayLocal } from '@/app/selectors';
import { useSalesforceLink } from '@/app/salesforceLinks';
import { SalesforceLink } from '@/components/SalesforceLink';
import { formatInt } from '@/components/format';
import { SyncBadge } from '@/components/SyncBadge';
import {
  filterAppointments,
  type AppointmentFilter,
  type TeamAppointment,
} from '@/domain/appointments';
import { LiveTag } from './AssistantBrick';

const FILTERS: { id: AppointmentFilter; label: string }[] = [
  { id: 'today', label: 'Heute' },
  { id: 'week', label: 'Diese Woche' },
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

/** Umschalter über der Terminliste: heute oder die ganze Woche */
export function AppointmentFilterSwitch({
  appointments,
  filter,
  onChange,
}: {
  appointments: readonly TeamAppointment[];
  filter: AppointmentFilter;
  onChange(filter: AppointmentFilter): void;
}) {
  return (
    <div role="group" aria-label="Zeitraum" className="flex flex-wrap gap-1">
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
            {item.label}{' '}
            <span className="tabular-nums">
              {formatInt(filterAppointments(appointments, item.id, todayLocal()).length)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Termine mit Status des Anrufprotokolls in Salesforce, neueste zuerst */
export function TeamAppointmentsTable({
  appointments,
  filter,
}: {
  appointments: readonly TeamAppointment[];
  filter: AppointmentFilter;
}) {
  const salesforceLink = useSalesforceLink();
  const rows = filterAppointments(appointments, filter, todayLocal());
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">
        {filter === 'today' ? 'Heute noch kein Termin.' : 'Keine Termine in dieser Woche.'}
      </p>
    );
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
              <td className="px-4 py-2.5 font-bold">
                <SalesforceLink target={salesforceLink(row.leadId)}>{row.leadName}</SalesforceLink>
              </td>
              <td className="px-4 py-2.5">{row.hunterName}</td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-2">
                  {row.assistantName}
                  {row.live && <LiveTag />}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">
                <SyncBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
