import { useQueue } from '@/app/selectors';
import type { BriefingMode } from '@/app/services';
import { useAppStore } from '@/app/store';
import { BandBadge } from '@/components/BandBadge';
import { Button } from '@/components/Button';
import { ControlTag } from '@/components/ControlTag';
import { Panel } from '@/components/Panel';
import { RangeField } from '@/components/RangeField';
import { Toggle } from '@/components/Toggle';
import { formatKm, formatMin, formatOne } from '@/components/format';
import { CONTROL_SHARE } from '@/domain/sampling';
import {
  BAND_A_MIN,
  BAND_B_MIN,
  CORRIDOR_MAX_KM,
  CORRIDOR_MIN_KM,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  WEIGHT_MAX,
  WEIGHT_MIN,
  normalizeWeights,
} from '@/domain/scoring';

const PREVIEW_SIZE = 12;

const BRIEFING_OPTIONS: { mode: BriefingMode; label: string; hint: string }[] = [
  { mode: 'rules', label: 'Regelbasiert', hint: 'Standard, ohne Netzwerk, sofort verfügbar' },
  {
    mode: 'llm',
    label: 'Sprachmodell',
    hint: 'Über den konfigurierten Endpunkt, ohne Namen und Telefonnummern. Fällt der Aufruf aus, greifen automatisch die Regeln.',
  },
];

export function ScoringView() {
  const weights = useAppStore((s) => s.weights);
  const corridorKm = useAppStore((s) => s.corridorKm);
  const controlEnabled = useAppStore((s) => s.controlEnabled);
  const setWeight = useAppStore((s) => s.setWeight);
  const resetWeights = useAppStore((s) => s.resetWeights);
  const setCorridorKm = useAppStore((s) => s.setCorridorKm);
  const setControlEnabled = useAppStore((s) => s.setControlEnabled);
  const briefingMode = useAppStore((s) => s.briefingMode);
  const setBriefingMode = useAppStore((s) => s.setBriefingMode);
  const queue = useQueue();
  const normalized = normalizeWeights(weights);
  const preview = queue.slice(0, PREVIEW_SIZE);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Gewichtung" actions={<Button onClick={resetWeights}>Standard</Button>}>
            <div className="space-y-4">
              {DIMENSION_KEYS.map((key) => (
                <RangeField
                  key={key}
                  label={DIMENSION_LABELS[key]}
                  value={weights[key]}
                  min={WEIGHT_MIN}
                  max={WEIGHT_MAX}
                  valueLabel={`${weights[key]} · ${formatOne(normalized[key])} %`}
                  onChange={(v) => setWeight(key, v)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Rohwerte 0 bis 50, normiert auf Summe 100. Band A ab {BAND_A_MIN}, Band B ab{' '}
              {BAND_B_MIN}.
            </p>
          </Panel>

          <Panel title="Korridor und Stichprobe">
            <div className="space-y-4">
              <RangeField
                label="Korridorbreite"
                value={corridorKm}
                min={CORRIDOR_MIN_KM}
                max={CORRIDOR_MAX_KM}
                step={0.5}
                valueLabel={`±${formatKm(corridorKm)}`}
                hint="Luftlinie zur Route. Leads außerhalb erscheinen nicht in der Warteschlange."
                onChange={setCorridorKm}
              />
              <Toggle
                label="Kontrollstichprobe"
                checked={controlEnabled}
                onChange={setControlEnabled}
                hint={`${Math.round(CONTROL_SHARE * 100)} % der Warteschlange aus Band B und C, gleichmäßig eingestreut`}
              />
            </div>
          </Panel>

          <Panel title="Briefing">
            <fieldset className="space-y-2">
              <legend className="sr-only">Briefing-Variante</legend>
              {BRIEFING_OPTIONS.map((option) => (
                <label key={option.mode} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="briefing-mode"
                    checked={briefingMode === option.mode}
                    onChange={() => setBriefingMode(option.mode)}
                    className="mt-0.5 accent-[var(--brand-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="block text-xs text-muted">{option.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </Panel>
        </div>

        <Panel title={`Rangfolge, erste ${PREVIEW_SIZE} von ${queue.length}`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 font-normal">#</th>
                <th className="py-1 font-normal">Band</th>
                <th className="py-1 font-normal">Firma</th>
                {DIMENSION_KEYS.map((key) => (
                  <th key={key} className="py-1 pl-3 text-right font-normal">
                    {DIMENSION_LABELS[key]}
                  </th>
                ))}
                <th className="py-1 pl-3 text-right font-normal">Umweg</th>
                <th className="py-1 pl-3 text-right font-normal">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((entry) => (
                <tr key={entry.lead.id}>
                  <td className="py-1.5 tabular-nums text-muted">{entry.position}</td>
                  <td className="py-1.5">
                    <BandBadge band={entry.band} />
                  </td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <span>{entry.lead.name}</span>
                      {entry.isControl && <ControlTag />}
                    </div>
                  </td>
                  {DIMENSION_KEYS.map((key) => (
                    <td key={key} className="py-1.5 pl-3 text-right tabular-nums">
                      {Math.round(entry.dimensions[key])}
                    </td>
                  ))}
                  <td className="py-1.5 pl-3 text-right tabular-nums">
                    {formatMin(entry.detourMinutes)}
                  </td>
                  <td className="py-1.5 pl-3 text-right font-bold tabular-nums">{entry.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
