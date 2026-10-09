import { useState } from 'react';
import { Button } from '@/components/Button';
import { formatInt } from '@/components/format';
import { settledReason, type MarketRow } from '@/domain/market';
import { CALL_SOLUTION_LABELS } from '@/domain/protocol';
import { formatMonth } from '@/domain/recall';
import { callOutcomeText } from '@/domain/teamCalls';

interface FollowUpTableProps {
  rows: readonly MarketRow[];
  /** Spalten Hunter und Telefonassistenz, nur für die Führung */
  showAssistant: boolean;
  /** Leads, die die Telefonassistenz von hier aus anrufen kann */
  callable?: ReadonlySet<string>;
  onCall?(leadId: string): void;
  onExport(): void;
}

const PAGE = 30;

function shortDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

function FollowUpCell({ row }: { row: MarketRow }) {
  if (row.bucket === null) return <span className="text-muted">–</span>;
  if (row.bucket === 'settled') return <span className="text-muted">{settledReason(row)}</span>;
  if (row.bucket === 'unknown') {
    return <span className="font-bold text-brand-primary">Vertragsende erfragen</span>;
  }
  if (row.bucket === 'now') {
    return (
      <span className="whitespace-nowrap rounded bg-brand-primary px-2 py-0.5 text-xs font-bold text-on-primary">
        Jetzt nachfassen
      </span>
    );
  }
  return <span className="whitespace-nowrap">ab {row.followUp ? shortDay(row.followUp) : ''}</span>;
}

/**
 * Nachfass-Liste: fällige Wettbewerbskunden oben, nach Nachfass-Termin; dann fehlende
 * Vertragsenden; dann die übrigen Firmen mit Gespräch.
 */
export function FollowUpTable({
  rows,
  showAssistant,
  callable,
  onCall,
  onExport,
}: FollowUpTableProps) {
  const [limit, setLimit] = useState(PAGE);
  const shown = rows.slice(0, limit);

  return (
    <section
      aria-label="Nachfass-Liste"
      className="overflow-hidden rounded-lg border border-border bg-panel"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold">Nachfass-Liste</h3>
          <p className="mt-0.5 text-xs text-muted">
            {formatInt(rows.length)} Firmen, fällige Vertragsenden zuerst
          </p>
        </div>
        <Button size="sm" onClick={onExport} disabled={rows.length === 0}>
          Auswahl als CSV
        </Button>
      </header>
      {rows.length === 0 ? (
        <p className="border-t border-border px-5 py-6 text-sm text-muted">
          Keine Firma in dieser Auswahl.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-surface text-left text-xs text-muted">
                <th className="px-5 py-2 font-bold">Firma</th>
                <th className="px-3 py-2 font-bold">Branche</th>
                {showAssistant && <th className="px-3 py-2 font-bold">Hunter</th>}
                {showAssistant && <th className="px-3 py-2 font-bold">Telefonassistenz</th>}
                <th className="px-3 py-2 font-bold">Aktuelle Lösung</th>
                <th className="px-3 py-2 font-bold">Vertrag bis</th>
                <th className="px-3 py-2 font-bold">Nachfassen</th>
                <th className="px-3 py-2 font-bold">Letztes Gespräch</th>
                <th className="px-3 py-2 font-bold">Notiz</th>
                {onCall && <th className="px-3 py-2" aria-label="Aktion" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((row) => {
                const competitor = row.protocol.solution === 'competitor';
                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-5 py-2">
                      <span className="block font-bold">{row.leadName}</span>
                      <span className="block text-xs text-muted">{row.city}</span>
                    </td>
                    <td className="px-3 py-2">{row.industry || 'unbekannt'}</td>
                    {showAssistant && (
                      <td className="whitespace-nowrap px-3 py-2">{row.hunterName}</td>
                    )}
                    {showAssistant && (
                      <td className="whitespace-nowrap px-3 py-2">{row.assistantName}</td>
                    )}
                    <td className="px-3 py-2">
                      {competitor ? (
                        <strong>{row.protocol.competitor ?? 'Anbieter unbekannt'}</strong>
                      ) : row.protocol.solution ? (
                        CALL_SOLUTION_LABELS[row.protocol.solution]
                      ) : (
                        <span className="text-muted">nicht erfasst</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {row.protocol.contractEnd ? formatMonth(row.protocol.contractEnd) : '–'}
                    </td>
                    <td className="px-3 py-2">
                      <FollowUpCell row={row} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="block tabular-nums">{shortDay(row.recordedAt)}</span>
                      <span className="block text-xs text-muted">
                        {callOutcomeText(row.outcome)}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-3 py-2">
                      <span className="line-clamp-2 text-xs" title={row.protocol.note ?? undefined}>
                        {row.protocol.note ?? '–'}
                      </span>
                    </td>
                    {onCall && (
                      <td className="px-3 py-2 text-right">
                        {row.bucket === 'settled' ? (
                          <span className="text-xs text-muted">–</span>
                        ) : row.leadId && callable?.has(row.leadId) ? (
                          <Button size="sm" onClick={() => row.leadId && onCall(row.leadId)}>
                            Anrufen
                          </Button>
                        ) : (
                          <span
                            className="text-xs text-muted"
                            title="In Sperrfrist oder nicht in der Leadliste"
                          >
                            gesperrt
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > limit && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE)}
              className="w-full border-t border-border px-5 py-2 text-left text-xs font-bold text-brand-ink hover:bg-surface"
            >
              Weitere {formatInt(Math.min(PAGE, rows.length - limit))} von{' '}
              {formatInt(rows.length - limit)} anzeigen
            </button>
          )}
        </div>
      )}
    </section>
  );
}
