import type { ReactNode } from 'react';
import { BandBadge } from '@/components/BandBadge';
import { Button } from '@/components/Button';
import { ControlTag } from '@/components/ControlTag';
import { Meter } from '@/components/Meter';
import { formatDateTime, formatInt, formatKm, formatMin } from '@/components/format';
import { buildBriefing, contactLabel } from '@/domain/briefing';
import { OUTCOME_LABELS, OUTCOME_TYPES } from '@/domain/outcomes';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/domain/scoring';
import type { CallOutcome, OutcomeType, QueueEntry } from '@/domain/types';
import { useBriefing } from './useBriefing';

interface BriefingPanelProps {
  entry: QueueEntry;
  latest: CallOutcome | undefined;
  busy: boolean;
  /** Name der anrufenden Person für den Einstiegssatz */
  callerName: string;
  onRecord(outcome: OutcomeType): void;
}

export function BriefingPanel({ entry, latest, busy, callerName, onRecord }: BriefingPanelProps) {
  const { lead } = entry;
  const { briefing, pending } = useBriefing(entry);
  // Regelbasiert mit dem Namen der Anruferin statt Platzhalter
  const named = buildBriefing(entry, callerName);
  const openingLine = briefing.source === 'rules' ? named.openingLine : briefing.openingLine;
  const phoneHref = lead.phone?.replace(/\s/g, '') ?? '';

  return (
    <article aria-label={`Briefing ${lead.name}`} className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <BandBadge band={entry.band} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-tight">{lead.name}</h2>
            {entry.isControl && <ControlTag />}
          </div>
          <p className="text-sm text-muted">
            {lead.industry || 'Branche unbekannt'} · {lead.city}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Score</div>
          <div className="text-3xl font-bold tabular-nums">{entry.score}</div>
        </div>
      </header>

      <section
        aria-label="Dimensionen"
        className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-6 gap-y-2"
      >
        {DIMENSION_KEYS.map((key) => (
          <Meter key={key} label={DIMENSION_LABELS[key]} value={entry.dimensions[key]} />
        ))}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
        <section className="rounded border border-border bg-panel p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
            Ansprechpartner
          </h3>
          <dl className="grid grid-cols-[7.5rem_1fr] gap-y-1.5 text-sm">
            <Fact label="Kontakt">{contactLabel(entry)}</Fact>
            <Fact label="Telefon">
              {lead.phone ? (
                <>
                  <a href={`tel:${phoneHref}`} className="underline">
                    {lead.phone}
                  </a>
                  <span className="font-normal text-muted">
                    {lead.hasDirectDial ? ' · Durchwahl' : ' · Zentrale'}
                  </span>
                </>
              ) : (
                <span className="font-normal text-muted">keine Angabe</span>
              )}
            </Fact>
            <Fact label="Adresse">
              {lead.street}, {lead.postalCode} {lead.city}
            </Fact>
            <Fact label="Branche">{lead.industry || 'unbekannt'}</Fact>
            <Fact label="Mitarbeitende">{formatInt(lead.commercialEmployees)}</Fact>
            <Fact label="Träger">{formatInt(lead.wearerCount)}</Fact>
            <Fact label="Luftlinie">{formatKm(entry.distanceKm)}</Fact>
            <Fact label="Umweg">{formatMin(entry.detourMinutes)}</Fact>
          </dl>
        </section>

        <section className="rounded border border-border bg-panel p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Aufhänger</h3>
            <span className="text-xs text-muted">
              {briefingSourceText(briefing.source, briefing.fallbackReason, pending)}
            </span>
          </div>
          <ol aria-live="polite" aria-busy={pending} className="space-y-2 text-sm">
            {briefing.hooks.map((hook, index) => (
              <li key={index} className="flex gap-2">
                <span className="w-4 shrink-0 font-bold tabular-nums text-muted">{index + 1}</span>
                <span>{hook}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded border border-brand-ink bg-panel p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
          Vertriebsleitfaden
        </h3>
        <p className="text-base leading-relaxed">{openingLine}</p>
      </section>

      {briefing.objectionHandling.length > 0 && (
        <section className="rounded border border-border bg-surface p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Einwandbehandlung
          </h3>
          <ul className="space-y-2 text-sm">
            {briefing.objectionHandling.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Ergebnis erfassen">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Ergebnis</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2">
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

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </>
  );
}

function briefingSourceText(
  source: 'rules' | 'llm',
  fallbackReason: string | undefined,
  pending: boolean,
): string {
  if (pending) return 'wird erstellt …';
  if (source === 'llm') return 'Sprachmodell';
  if (fallbackReason) return `regelbasiert (${fallbackReason})`;
  return 'regelbasiert';
}
