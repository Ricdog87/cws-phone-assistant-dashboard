import { formatInt } from '@/components/format';
import type { MemberStanding } from '@/domain/standings';
import { largestGaps } from './boardRows';
import { noun } from './memberFormat';

interface AttentionPanelProps {
  members: readonly MemberStanding[];
  keyOf(memberId: string): string;
  onSelect(key: string): void;
  limit?: number;
}

/** Wen die Führung heute ansprechen sollte: größte Lücken zum Wochenziel */
export function AttentionPanel({ members, keyOf, onSelect, limit = 5 }: AttentionPanelProps) {
  const gaps = largestGaps(members, limit);
  const open = members.filter((member) => member.appointmentsRemaining > 0).length;

  return (
    <section aria-label="Größte Lücken" className="rounded-lg border border-border bg-panel p-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Größte Lücken</h3>
      <p className="mt-1 text-sm text-muted">
        {open === 0
          ? 'Alle im Wochenziel.'
          : `${formatInt(open)} von ${formatInt(members.length)} ${noun(members.length, 'Person', 'Personen')} noch unter dem Wochenziel.`}
      </p>
      {gaps.length > 0 && (
        <ol className="mt-4 divide-y divide-border">
          {gaps.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelect(keyOf(member.id))}
                className="flex w-full items-center justify-between gap-3 rounded py-2.5 text-left hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{member.fullName}</span>
                  <span className="block text-xs text-muted">
                    {member.dayCallsRemaining === 0
                      ? 'Tagesziel erreicht'
                      : `Noch ${formatInt(member.dayCallsRemaining)} ${noun(member.dayCallsRemaining, 'Anruf', 'Anrufe')} heute`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-bold tabular-nums leading-none text-brand-primary">
                    {formatInt(member.appointmentsRemaining)}
                  </span>
                  <span className="block text-xs text-muted">
                    {noun(member.appointmentsRemaining, 'Termin', 'Termine')} offen
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted">Klick auf eine Person öffnet ihre Kennzahlen.</p>
    </section>
  );
}
