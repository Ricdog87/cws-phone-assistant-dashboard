import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { formatInt, formatOne } from '@/components/format';
import {
  MIN_CALLS_FOR_CALIBRATION,
  calibrate,
  type CalibrationStatus,
  type RateCell,
} from '@/domain/calibration';
import { DIMENSION_KEYS, DIMENSION_LABELS, normalizeWeights } from '@/domain/scoring';
import type { Weights } from '@/domain/types';

const STATUS_TEXT: Record<Exclude<CalibrationStatus, 'ok' | 'too_few_calls'>, string> = {
  single_class: 'Kein Vorschlag: Es liegen nur Anrufe mit oder nur ohne Termin vor.',
  no_positive_effect:
    'Kein Vorschlag: Keine Dimension erhöht nach den Daten die Terminquote. Datenlage prüfen.',
  not_converged: 'Kein Vorschlag: Die Schätzung ist numerisch nicht stabil. Mehr Anrufe abwarten.',
};

function percent(cell: RateCell): string {
  return cell.rate === null ? '–' : `${formatOne(cell.rate * 100)} %`;
}

function sameWeights(a: Weights, b: Weights): boolean {
  return DIMENSION_KEYS.every((k) => a[k] === b[k]);
}

export function CalibrationPanel() {
  const outcomes = useAppStore((s) => s.outcomes);
  const weights = useAppStore((s) => s.weights);
  const setWeights = useAppStore((s) => s.setWeights);
  const [pending, setPending] = useState<Weights | null>(null);
  const [applied, setApplied] = useState(false);

  // Nur Berechnung. Übernommen wird ausschließlich über die Bestätigung unten.
  const report = useMemo(() => calibrate(outcomes, weights), [outcomes, weights]);
  const current = normalizeWeights(weights);
  const suggestion = report.suggestion;
  const alreadyApplied = suggestion !== null && sameWeights(weights, suggestion.rawWeights);

  function confirm() {
    if (!pending) return;
    setWeights(pending);
    setPending(null);
    setApplied(true);
  }

  return (
    <Panel title="Kalibrierung">
      <div className="space-y-5">
        <p className="text-sm">
          {formatInt(report.calls)} Anrufe mit Ergebnis, davon {formatInt(report.appointments)}{' '}
          Termine
          {report.calls > 0 &&
            ` (${formatOne((report.appointments / report.calls) * 100)} %)`},{' '}
          {formatInt(report.controlCalls)} aus der Kontrollstichprobe.
        </p>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Terminquote je Band
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-normal">Band</th>
                  <th className="py-1 pl-3 text-right font-normal">Anrufe</th>
                  <th className="py-1 pl-3 text-right font-normal">Termine</th>
                  <th className="py-1 pl-3 text-right font-normal">Quote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(['A', 'B', 'C'] as const).map((band) => (
                  <tr key={band}>
                    <td className="py-1">{band}</td>
                    <td className="py-1 pl-3 text-right tabular-nums">
                      {formatInt(report.byBand[band].calls)}
                    </td>
                    <td className="py-1 pl-3 text-right tabular-nums">
                      {formatInt(report.byBand[band].appointments)}
                    </td>
                    <td className="py-1 pl-3 text-right tabular-nums">
                      {percent(report.byBand[band])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Terminquote je Dimension
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-normal">Wert</th>
                  {report.byDimension.fit.map((bin) => (
                    <th key={bin.from} className="py-1 pl-3 text-right font-normal">
                      {bin.from}–{bin.to}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIMENSION_KEYS.map((key) => (
                  <tr key={key}>
                    <td className="py-1">{DIMENSION_LABELS[key]}</td>
                    {report.byDimension[key].map((bin) => (
                      <td
                        key={bin.from}
                        className="py-1 pl-3 text-right tabular-nums"
                        title={`${bin.appointments} Termine bei ${bin.calls} Anrufen`}
                      >
                        {percent(bin)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {report.status === 'too_few_calls' && (
          <div>
            <Meter
              label="Anrufe bis zum ersten Gewichtsvorschlag"
              value={report.calls}
              max={MIN_CALLS_FOR_CALIBRATION}
              valueLabel={`${formatInt(report.calls)} von ${MIN_CALLS_FOR_CALIBRATION}`}
            />
            <p className="mt-2 text-xs text-muted">
              Ein Vorschlag für die Gewichte wird ab {MIN_CALLS_FOR_CALIBRATION} erfassten Anrufen
              gerechnet. Es fehlen noch {formatInt(report.missingCalls)}.
            </p>
          </div>
        )}

        {report.status !== 'ok' && report.status !== 'too_few_calls' && (
          <p className="text-sm font-bold">{STATUS_TEXT[report.status]}</p>
        )}

        {suggestion && (
          <section aria-label="Gewichtsvorschlag">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Vorschlag aus logistischer Regression
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-normal">Dimension</th>
                  <th className="py-1 pl-3 text-right font-normal">Aktuell</th>
                  <th className="py-1 pl-3 text-right font-normal">Vorschlag</th>
                  <th className="py-1 pl-3 text-right font-normal">Regler</th>
                  <th className="py-1 pl-3 text-right font-normal">Koeffizient</th>
                  <th className="py-1 pl-3 font-normal">Hinweis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DIMENSION_KEYS.map((key) => {
                  const c = suggestion.coefficients[key];
                  return (
                    <tr key={key}>
                      <td className="py-1">{DIMENSION_LABELS[key]}</td>
                      <td className="py-1 pl-3 text-right tabular-nums">
                        {formatOne(current[key])} %
                      </td>
                      <td className="py-1 pl-3 text-right font-bold tabular-nums">
                        {formatOne(suggestion.normalizedWeights[key])} %
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums">
                        {suggestion.rawWeights[key]}
                      </td>
                      <td className="py-1 pl-3 text-right tabular-nums">
                        {formatOne(c.estimate)} ± {formatOne(c.standardError)}
                      </td>
                      <td className="py-1 pl-3 text-xs text-muted">
                        {c.estimate < 0 ? 'negativ, Gewicht 0' : c.significant ? '' : 'unsicher'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Trennschärfe auf den erfassten Anrufen (AUC, 0,5 = Zufall): aktuell{' '}
              {suggestion.aucCurrent.toFixed(3).replace('.', ',')}, Vorschlag{' '}
              {suggestion.aucSuggested.toFixed(3).replace('.', ',')}. Gemessen auf denselben Daten,
              aus denen der Vorschlag stammt, daher eher zu optimistisch. „Unsicher“ heißt: Der
              Effekt ist kleiner als zwei Standardfehler.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {pending ? (
                <>
                  <span className="text-sm">
                    Gewichte auf {DIMENSION_KEYS.map((k) => pending[k]).join(' / ')} setzen? Die
                    Rangfolge ändert sich sofort.
                  </span>
                  <Button variant="primary" onClick={confirm}>
                    Bestätigen
                  </Button>
                  <Button onClick={() => setPending(null)}>Abbrechen</Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    disabled={alreadyApplied}
                    onClick={() => {
                      setApplied(false);
                      setPending({ ...suggestion.rawWeights });
                    }}
                  >
                    Vorschlag übernehmen
                  </Button>
                  {alreadyApplied && (
                    <span className="text-sm" role="status">
                      {applied
                        ? 'Vorschlag übernommen. Zurück über „Standard“ bei der Gewichtung.'
                        : 'Die aktuellen Gewichte entsprechen dem Vorschlag.'}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              Der Vorschlag greift nie automatisch. Zielgröße ist „Termin vereinbart“ gegen alle
              anderen Ergebnisse.
            </p>
          </section>
        )}
      </div>
    </Panel>
  );
}
