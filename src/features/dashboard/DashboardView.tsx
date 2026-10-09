import { useMemo } from 'react';
import { useSalesforceLink } from '@/app/salesforceLinks';
import { SalesforceLink } from '@/components/SalesforceLink';
import { useCallDay, useGoalProgress } from '@/app/selectors';
import { useAppStore } from '@/app/store';
import { DirectorView } from './DirectorView';
import { TeamLeadView } from './TeamLeadView';
import { Button } from '@/components/Button';
import { GoalStrip } from '@/components/GoalStrip';
import { downloadText } from '@/components/download';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { formatDateTime, formatInt, formatOne } from '@/components/format';
import { contactsToCsv, outcomesToCsv } from '@/domain/export';
import { OUTCOME_LABELS, computeMetrics, type RateStats } from '@/domain/outcomes';
import type { Band } from '@/domain/types';

const BAND_BAR: Record<Band, string> = {
  A: 'bg-band-a',
  B: 'bg-band-b',
  C: 'bg-band-c',
};

function rateLabel(stats: RateStats): string {
  return `${formatOne(stats.per100)} je 100 · ${stats.appointments} von ${stats.calls}`;
}

export function DashboardView() {
  const level = useAppStore((s) => s.viewLevel);
  if (level === 'director') return <DirectorView />;
  if (level === 'teamLead') return <TeamLeadView />;
  return <AssistantDashboard />;
}

function AssistantDashboard() {
  const salesforceLink = useSalesforceLink();
  const outcomes = useAppStore((s) => s.outcomes);
  const contacts = useAppStore((s) => s.contacts);
  const recalls = useAppStore((s) => s.recalls);
  const clearOutcomes = useAppStore((s) => s.clearOutcomes);
  const metrics = useMemo(() => computeMetrics(outcomes), [outcomes]);
  const goals = useGoalProgress();
  const today = useCallDay();

  const bandMax = Math.max(10, ...(['A', 'B', 'C'] as const).map((b) => metrics.byBand[b].per100));
  const compareMax = Math.max(10, metrics.control.per100, metrics.regular.per100);
  const recent = [...outcomes].reverse().slice(0, 10);

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(outcomesToCsv(outcomes), `anrufergebnisse-${date}.csv`);
  }

  function exportContacts() {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(contactsToCsv(contacts), `kontakte-salesforce-${date}.csv`);
  }

  function reset() {
    if (
      window.confirm(
        'Alle erfassten Anrufergebnisse, Kontakte und Wiedervorlagen endgültig löschen?',
      )
    ) {
      void clearOutcomes();
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Panel title="Tages- und Wochenziel">
          <GoalStrip
            dayCalls={goals.day.calls}
            dayAppointments={goals.day.appointments}
            weekCalls={goals.week.calls}
            weekAppointments={goals.week.appointments}
            dailyCallGoal={goals.dailyCallGoal}
            weeklyGoal={goals.weeklyAppointmentGoal}
            weekday={today.weekday}
            dateLabel={today.dateLabel}
            daysRemaining={today.daysRemaining}
            weekEndLabel={today.weekEndLabel}
          />
          <p className="mt-4 text-xs text-muted">
            Tagesziel: etwa {formatInt(goals.dailyCallGoal)} Anrufe. Wochenziel:{' '}
            {formatInt(goals.weeklyAppointmentGoal)} vereinbarte Termine. Jeder erfasste Anruf
            zählt. Die Woche beginnt am Montag.
          </p>
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Anrufe gesamt" value={formatInt(metrics.total.calls)} />
          <StatTile label="Termine gesamt" value={formatInt(metrics.total.appointments)} />
          <StatTile
            label="Termine je 100 Anrufe"
            value={formatOne(metrics.total.per100)}
            hint="Alle erfassten Anrufe"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Terminquote nach Band">
            <div className="space-y-4">
              {(['A', 'B', 'C'] as const).map((band) => (
                <Meter
                  key={band}
                  label={`Band ${band}`}
                  value={metrics.byBand[band].per100}
                  max={bandMax}
                  valueLabel={rateLabel(metrics.byBand[band])}
                  barClassName={BAND_BAR[band]}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Kontrollstichprobe gegen regulär">
            <div className="space-y-4">
              <Meter
                label="Kontrollstichprobe"
                value={metrics.control.per100}
                max={compareMax}
                valueLabel={rateLabel(metrics.control)}
              />
              <Meter
                label="Regulär bearbeitet"
                value={metrics.regular.per100}
                max={compareMax}
                valueLabel={rateLabel(metrics.regular)}
              />
            </div>
            <p className="mt-4 text-xs text-muted">
              Die Kontrollstichprobe zeigt, wie Leads abschneiden, die ohne Stichprobe kaum
              angerufen würden. Aussagekräftig erst ab einigen hundert Anrufen.
            </p>
          </Panel>
        </div>

        <Panel
          title="Anrufergebnisse"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={reset}
                disabled={outcomes.length === 0 && contacts.length === 0 && recalls.length === 0}
              >
                Löschen
              </Button>
              <Button onClick={exportContacts} disabled={contacts.length === 0}>
                Kontakte exportieren ({contacts.length})
              </Button>
              <Button variant="primary" onClick={exportCsv} disabled={outcomes.length === 0}>
                CSV exportieren
              </Button>
            </div>
          }
        >
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Ergebnisse erfasst.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-normal">Zeitpunkt</th>
                  <th className="py-1 font-normal">Firma</th>
                  <th className="py-1 font-normal">Band</th>
                  <th className="py-1 font-normal">Ergebnis</th>
                  <th className="py-1 font-normal">Kontrolle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="py-1 tabular-nums">{formatDateTime(o.recordedAt)}</td>
                    <td className="py-1">
                      <SalesforceLink target={salesforceLink(o.leadId)}>
                        {o.leadName}
                      </SalesforceLink>
                    </td>
                    <td className="py-1">{o.band}</td>
                    <td className="py-1">{OUTCOME_LABELS[o.outcome]}</td>
                    <td className="py-1">{o.isControl ? 'ja' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted">
            Export mit Semikolon und BOM, öffnet direkt in Excel. Die letzten zehn Ergebnisse sind
            oben aufgeführt.
          </p>
        </Panel>
      </div>
    </div>
  );
}
