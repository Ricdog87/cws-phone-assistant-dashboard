import { BandBadge } from '@/components/BandBadge';
import { Button } from '@/components/Button';
import { ControlTag } from '@/components/ControlTag';
import { Meter } from '@/components/Meter';
import { formatDateTime, formatKm, formatMin } from '@/components/format';
import { contactLabel } from '@/domain/briefing';
import { OUTCOME_LABELS, OUTCOME_TYPES } from '@/domain/outcomes';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/domain/scoring';
import type { CallOutcome, OutcomeType, QueueEntry } from '@/domain/types';
import { useBriefing } from './useBriefing';

interface BriefingPanelProps {
  entry: QueueEntry;
  latest: CallOutcome | undefined;
  busy: boolean;
  onRecord(outcome: OutcomeType): void;
}

export function BriefingPanel({ entry, latest, busy, onRecord }: BriefingPanelProps) {
  const { lead } = entry;
  const { briefing, pending } = useBriefing(entry);

  return (
    <article aria-label={`Briefing ${lead.name}`} className="flex flex-col gap-5">
      <header className="flex items-start gap-3">
        <BandBadge band={entry.band} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-tight">{lead.name}</h2>
            {entry.isControl && <ControlTag />}
          </div>
          <p className="text-sm text-muted">
            {lead.industry || 'Branche unbekannt'} · {lead.street}, {lead.postalCode} {lead.city}
          </p>
          <p className="text-sm text-muted">
            {formatKm(entry.distanceKm)} Luftlinie zur Route · {formatMin(entry.detourMinutes)}{' '}
            Umweg · {lead.commercialEmployees} gewerbliche Mitarbeitende · {lead.wearerCount} Träger
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Score</div>
          <div className="text-3xl font-bold tabular-nums">{entry.score}</div>
        </div>
      </header>

      <section aria-label="Dimensionen" className="grid grid-cols-2 gap-x-6 gap-y-3">
        {DIMENSION_KEYS.map((key) => (
          <Meter key={key} label={DIMENSION_LABELS[key]} value={entry.dimensions[key]} />
        ))}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
          Ansprechpartner
        </h3>
        <p className="text-sm">{contactLabel(entry)}</p>
        {lead.phone && (
          <p className="text-sm">
            <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="font-bold underline">
              {lead.phone}
            </a>
            {lead.hasDirectDial ? ' · Durchwahl' : ' · Zentrale'}
          </p>
        )}
      </section>

      <div aria-live="polite" aria-busy={pending} className="flex flex-col gap-5">
        <p className="text-xs text-muted">
          {briefingSourceText(briefing.source, briefing.fallbackReason, pending)}
        </p>

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Aufhänger</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {briefing.hooks.map((hook, i) => (
              <li key={i}>{hook}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
            Einstiegssatz
          </h3>
          <p className="rounded bg-surface p-3 text-sm leading-relaxed">{briefing.openingLine}</p>
        </section>

        {briefing.objectionHandling.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
              Einwandbehandlung
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {briefing.objectionHandling.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section aria-label="Ergebnis erfassen">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Ergebnis</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {OUTCOME_TYPES.map((type, index) => (
            <Button
              key={type}
              variant={type === 'appointment' ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => onRecord(type)}
              aria-keyshortcuts={String(index + 1)}
            >
              <span className="mr-2 rounded border border-current px-1 text-xs">{index + 1}</span>
              {OUTCOME_LABELS[type]}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Tastatur: Pfeil hoch und runter wechselt den Lead, 1 bis 4 bucht das Ergebnis.
        </p>
        {latest && (
          <p className="mt-2 text-sm">
            Zuletzt erfasst: <strong>{OUTCOME_LABELS[latest.outcome]}</strong> am{' '}
            {formatDateTime(latest.recordedAt)}
          </p>
        )}
      </section>
    </article>
  );
}

function briefingSourceText(
  source: 'rules' | 'llm',
  fallbackReason: string | undefined,
  pending: boolean,
): string {
  if (pending) return 'Briefing über Sprachmodell wird erstellt, bis dahin regelbasiert.';
  if (source === 'llm') return 'Briefing: Sprachmodell. Vor dem Anruf auf Plausibilität prüfen.';
  if (fallbackReason)
    return `Briefing: regelbasiert, Sprachmodell nicht verfügbar (${fallbackReason}).`;
  return 'Briefing: regelbasiert.';
}
