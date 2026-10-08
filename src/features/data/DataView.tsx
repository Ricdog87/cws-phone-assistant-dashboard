import { useState } from 'react';
import { useAppStore } from '@/app/store';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { StatTile } from '@/components/StatTile';
import { formatInt } from '@/components/format';
import { PROVIDER_OPTIONS, createProvider } from '@/data/providers';
import type { ProviderId } from '@/data/providers/types';
import { CsvImport } from './CsvImport';
import { RowErrorList } from './RowErrorList';

export function DataView() {
  const sourceId = useAppStore((s) => s.sourceId);
  const sourceLabel = useAppStore((s) => s.sourceLabel);
  const report = useAppStore((s) => s.loadReport);
  const loadError = useAppStore((s) => s.loadError);
  const loading = useAppStore((s) => s.loading);
  const loadFromProvider = useAppStore((s) => s.loadFromProvider);
  const [choice, setChoice] = useState<ProviderId>(sourceId);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-6 lg:grid-cols-[360px_1fr]">
        <Panel title="Datenquelle">
          <fieldset className="space-y-2">
            <legend className="sr-only">Datenquelle wählen</legend>
            {PROVIDER_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${
                  choice === option.id ? 'border-brand-ink' : 'border-border'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value={option.id}
                  checked={choice === option.id}
                  onChange={() => setChoice(option.id)}
                  className="mt-0.5 accent-[var(--brand-primary)]"
                />
                <span>
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </Panel>

        <div className="space-y-4">
          <Panel title={`Aktiv: ${sourceLabel}`}>
            {report ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatTile label="Datensätze gelesen" value={formatInt(report.total)} />
                <StatTile label="Geladen" value={formatInt(report.loaded)} />
                <StatTile label="Davon nachgeschlagen" value={formatInt(report.geocoded)} />
                <StatTile
                  label="Ohne Kartenposition"
                  value={formatInt(report.withoutCoordinates)}
                />
                <StatTile label="Verworfen, fehlerhaft" value={formatInt(report.rejectedInvalid)} />
              </div>
            ) : (
              <p className="text-sm text-muted">Noch keine Daten geladen.</p>
            )}
            {loadError && (
              <p role="alert" className="mt-3 text-sm font-bold text-brand-primary">
                {loadError}
              </p>
            )}
          </Panel>

          {report && report.rowErrors.length > 0 && (
            <Panel title="Fehlerliste je Zeile">
              <RowErrorList errors={report.rowErrors} />
            </Panel>
          )}

          {choice === 'csv' ? (
            <Panel title="CSV-Import">
              <CsvImport />
            </Panel>
          ) : (
            <Panel title="Laden">
              <Button
                variant="primary"
                disabled={loading}
                onClick={() => void loadFromProvider(createProvider(choice))}
              >
                {PROVIDER_OPTIONS.find((o) => o.id === choice)?.label} laden
              </Button>
              {choice !== 'mock' && (
                <p className="mt-3 text-xs text-muted">
                  Diese Quelle ist als Gerüst angelegt. Feldzuordnung und Anbindungspunkt stehen in
                  docs/datenmodell.md und docs/architektur.md.
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
