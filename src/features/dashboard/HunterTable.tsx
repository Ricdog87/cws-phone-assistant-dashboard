import { formatInt, formatOne } from '@/components/format';
import { hunterByName } from '@/data/hunters';
import type { HunterRow } from '@/domain/hunterBoard';

interface HunterTableProps {
  rows: readonly HunterRow[];
}

const HEAD = 'px-4 py-2.5 text-right font-normal';
const CELL = 'px-4 py-2.5 text-right tabular-nums';

/**
 * Potenzialliste je Hunter, wie der Accountbericht in Salesforce, ergänzt um
 * Qualität (Band A, noch nie kontaktiert) und Wochenstand. Wenigste Termine oben.
 */
export function HunterTable({ rows }: HunterTableProps) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">Keine Accounts mit Accountinhaber geladen.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-normal">
              Hunter und Gebiet
            </th>
            <th scope="col" className={HEAD}>
              Telefon&shy;assistenzen
            </th>
            <th scope="col" className={HEAD}>
              Accounts
            </th>
            <th scope="col" className={HEAD}>
              Band A
            </th>
            <th scope="col" className={HEAD}>
              Nie kontaktiert
            </th>
            <th scope="col" className={HEAD}>
              In Sperrfrist
            </th>
            <th scope="col" className={HEAD}>
              Anrufe Woche
            </th>
            <th scope="col" className={HEAD}>
              Termine Woche
            </th>
            <th scope="col" className={HEAD}>
              Je 100 Anrufe
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const area = hunterByName(row.hunter)?.area;
            return (
              <tr key={row.hunter} className="hover:bg-surface">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className="block font-bold">{row.hunter}</span>
                  {area && <span className="block text-xs text-muted">{area}</span>}
                </th>
                <td className={CELL} title={row.assistants.join(', ') || undefined}>
                  {formatInt(row.assistants.length)}
                </td>
                <td className={CELL}>{formatInt(row.accounts)}</td>
                <td className={CELL}>{formatInt(row.aAccounts)}</td>
                <td className={CELL}>{formatInt(row.neverContacted)}</td>
                <td className={`${CELL} text-muted`}>{formatInt(row.inCooldown)}</td>
                <td className={CELL}>{formatInt(row.weekCalls)}</td>
                <td className={`${CELL} font-bold`}>{formatInt(row.weekAppointments)}</td>
                <td className={CELL}>{formatOne(row.appointmentsPer100)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
