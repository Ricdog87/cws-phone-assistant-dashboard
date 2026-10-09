import { formatInt } from '@/components/format';
import type { QuarterBar } from '@/domain/market';
import { CONTRACT_RECALL_MONTHS_BEFORE } from '@/domain/qualificationConfig';

interface ContractQuartersProps {
  bars: readonly QuarterBar[];
  /** Wettbewerbskunden ohne bekanntes Vertragsende */
  unknown: number;
}

/** Höhe der Balkenfläche in Pixeln */
const PLOT_HEIGHT = 150;

/**
 * Vertragsenden beim Wettbewerb je Quartal als gestapelte Säulen: unten die Verträge, bei
 * denen das Nachfassen schon möglich ist, darüber die übrigen.
 */
export function ContractQuarters({ bars, unknown }: ContractQuartersProps) {
  const max = Math.max(1, ...bars.map((bar) => bar.now + bar.later));
  const total = bars.reduce((sum, bar) => sum + bar.now + bar.later, 0);
  const summary = bars
    .map((bar) => `${bar.label}: ${bar.now + bar.later}, davon ${bar.now} jetzt`)
    .join('; ');

  return (
    <section
      aria-label="Vertragsenden je Quartal"
      className="rounded-lg border border-border bg-panel p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Verträge beim Wettbewerb laufen aus</h3>
          <p className="mt-0.5 text-xs text-muted">
            Offene Firmen je Quartal des Vertragsendes, ohne Termin oder Sperre. Nachfassen ab{' '}
            {CONTRACT_RECALL_MONTHS_BEFORE} Monate vorher.
          </p>
        </div>
        <ul className="flex gap-4 text-xs text-muted" aria-label="Legende">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-primary" aria-hidden />
            Jetzt nachfassen
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-ink" aria-hidden />
            Später
          </li>
        </ul>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted">Keine Vertragsenden in dieser Auswahl.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Vertragsenden je Quartal. ${summary}`}
            className="mt-6 flex items-end gap-2 border-b border-border"
            style={{ height: PLOT_HEIGHT + 22 }}
          >
            {bars.map((bar) => {
              const count = bar.now + bar.later;
              const height = (value: number) => Math.round((value / max) * PLOT_HEIGHT);
              return (
                <div
                  key={bar.key}
                  title={`${bar.label}: ${formatInt(count)} Verträge, davon ${formatInt(bar.now)} jetzt nachfassen`}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-xs font-bold tabular-nums">
                    {count > 0 ? formatInt(count) : ''}
                  </span>
                  <div className="flex w-full max-w-[24px] flex-col-reverse gap-[2px]">
                    {bar.now > 0 && (
                      <span
                        className={`block bg-brand-primary ${bar.later > 0 ? '' : 'rounded-t'}`}
                        style={{ height: height(bar.now) }}
                      />
                    )}
                    {bar.later > 0 && (
                      <span
                        className="block rounded-t bg-brand-ink"
                        style={{ height: height(bar.later) }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-2" aria-hidden>
            {bars.map((bar) => (
              <span
                key={bar.key}
                className="min-w-0 flex-1 truncate text-center text-xs text-muted"
              >
                {bar.label}
              </span>
            ))}
          </div>
        </>
      )}
      {unknown > 0 && (
        <p className="mt-3 text-xs text-muted">
          Bei <strong className="text-brand-ink">{formatInt(unknown)}</strong>{' '}
          {unknown === 1 ? 'Firma' : 'Firmen'} beim Wettbewerb fehlt das Vertragsende. Beim nächsten
          Gespräch erfragen.
        </p>
      )}
    </section>
  );
}
