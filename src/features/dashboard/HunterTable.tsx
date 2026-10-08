import { formatInt, formatOne } from '@/components/format';
import type { HunterRow } from '@/domain/hunterBoard';

const NAMED_ASSISTANTS = 3;

function assistantsLabel(assistants: readonly string[]): string {
  if (assistants.length === 0) return 'Telefonassistenz nicht zugeordnet';
  const named = assistants.slice(0, NAMED_ASSISTANTS).join(', ');
  const rest = assistants.length - NAMED_ASSISTANTS;
  const count = `${assistants.length} ${assistants.length === 1 ? 'Telefonassistenz' : 'Telefonassistenzen'}`;
  return rest > 0 ? `${count}: ${named} und ${rest} weitere` : `${count}: ${named}`;
}

interface HunterTableProps {
  rows: readonly HunterRow[];
}

/**
 * Potenzialliste je Hunter, wie der Accountbericht in Salesforce, ergänzt um
 * Qualität (Band A, noch nie kontaktiert) und Wochenstand. Wenigste Termine oben.
 */
export function HunterTable({ rows }: HunterTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        Keine Accounts mit Accountinhaber geladen.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">
              Hunter
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Accounts
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Band A
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Noch nie kontaktiert
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              In Sperrfrist
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Anrufe diese Woche
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Termine diese Woche
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              Termine je 100 Anrufe
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.hunter}>
              <th scope="row" className="px-4 py-3 text-left font-normal">
                <span className="block font-bold">{row.hunter}</span>
                <span className="block text-xs text-muted" title={row.assistants.join(', ')}>
                  {assistantsLabel(row.assistants)}
                </span>
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(row.accounts)}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">
                {formatInt(row.aAccounts)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(row.neverContacted)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {formatInt(row.inCooldown)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(row.weekCalls)}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">
                {formatInt(row.weekAppointments)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatOne(row.appointmentsPer100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
