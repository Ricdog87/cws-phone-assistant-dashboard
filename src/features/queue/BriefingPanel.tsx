import type { ReactNode } from 'react';
import { useContactLink, useSalesforceLink } from '@/app/salesforceLinks';
import { SalesforceLink } from '@/components/SalesforceLink';
import { BandBadge } from '@/components/BandBadge';
import { ControlTag } from '@/components/ControlTag';
import { todayLocal } from '@/app/selectors';
import { formatInt } from '@/components/format';
import { activityLabel, daysSinceActivity } from '@/domain/activity';
import { buildBriefing, contactLabel } from '@/domain/briefing';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/domain/scoring';
import type { QueueEntry } from '@/domain/types';
import { RecallTask } from '@/features/recalls/RecallTask';
import { useOpenRecall } from '@/features/recalls/useRecalls';
import { ContactCapture } from './ContactCapture';
import { useBriefing } from './useBriefing';

interface BriefingPanelProps {
  entry: QueueEntry;
  /** Name der anrufenden Person für den Einstiegssatz */
  callerName: string;
}

/**
 * Briefing für den Anruf, von oben nach unten in der Reihenfolge des Gesprächs: Firma mit
 * Kennzahlen in zwei Zeilen, wen anrufen, was sagen. Ohne Scrollen bis zu den Aufhängern.
 */
export function BriefingPanel({ entry, callerName }: BriefingPanelProps) {
  const { lead } = entry;
  const salesforceLink = useSalesforceLink();
  const contactLink = useContactLink();
  const recall = useOpenRecall(lead.id);
  const { briefing, pending } = useBriefing(entry);
  // Regelbasiert mit dem Namen der Anruferin statt Platzhalter
  const named = buildBriefing(entry, callerName);
  const openingLine = briefing.source === 'rules' ? named.openingLine : briefing.openingLine;
  const phoneHref = lead.phone?.replace(/\s/g, '') ?? '';
  const address = [lead.street, [lead.postalCode, lead.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <article aria-label={`Briefing ${lead.name}`} className="flex flex-col gap-3">
      <header className="flex items-start gap-3">
        <BandBadge band={entry.band} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-tight">
              <SalesforceLink target={salesforceLink(lead.id)}>{lead.name}</SalesforceLink>
            </h2>
            {entry.isControl && <ControlTag />}
          </div>
          <p className="truncate text-sm text-muted">
            {lead.industry || 'Branche unbekannt'} · {address || lead.city}
          </p>
          <dl aria-label="Firmendaten" className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            <InlineFact label="Mitarbeitende">{formatInt(lead.commercialEmployees)}</InlineFact>
            <InlineFact label="Träger">{formatInt(lead.wearerCount)}</InlineFact>
            <InlineFact label="Hunter">{lead.owner ?? 'nicht zugeordnet'}</InlineFact>
            <InlineFact label="Letzte Aktivität">
              {activityLabel(daysSinceActivity(lead.lastActivity, todayLocal()))}
            </InlineFact>
          </dl>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted">Score</div>
          <div className="text-3xl font-bold leading-none tabular-nums">{entry.score}</div>
          <dl aria-label="Dimensionen" className="mt-1.5 flex gap-2 text-xs text-muted">
            {DIMENSION_KEYS.map((key) => (
              <div key={key} className="flex gap-1">
                <dt>{DIMENSION_LABELS[key]}</dt>
                <dd className="font-bold tabular-nums text-brand-ink">
                  {Math.round(entry.dimensions[key])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {recall && <RecallTask key={`wv-${recall.id}`} recall={recall} />}

      <section
        aria-label="Ansprechpartner"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded border border-border bg-panel px-4 py-2 text-sm"
      >
        <p className="min-w-0">
          <span className="mr-2 text-xs text-muted">Ansprechpartner</span>
          {lead.contactName ? (
            <>
              <strong>
                <SalesforceLink target={contactLink(lead)}>{lead.contactName}</SalesforceLink>
              </strong>
              {lead.contactRole && <span className="text-muted">, {lead.contactRole}</span>}
            </>
          ) : (
            <span className="text-muted">{contactLabel(entry)}</span>
          )}
        </p>
        <p className="whitespace-nowrap">
          <span className="mr-2 text-xs text-muted">Telefon</span>
          {lead.phone ? (
            <>
              <a href={`tel:${phoneHref}`} className="font-bold underline">
                {lead.phone}
              </a>
              <span className="text-muted">
                {lead.hasDirectDial ? ' · Durchwahl' : ' · Zentrale'}
              </span>
            </>
          ) : (
            <span className="text-muted">keine Angabe</span>
          )}
        </p>
        <ContactCapture key={`kontakt-${lead.id}`} lead={lead} />
      </section>

      <section
        aria-label="Vertriebsleitfaden"
        className="rounded border border-brand-ink bg-panel px-4 py-3"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
            Vertriebsleitfaden
          </h3>
          <span className="text-xs text-muted">
            {briefingSourceText(briefing.source, briefing.fallbackReason, pending)}
          </span>
        </div>
        <p className="text-base leading-relaxed">{openingLine}</p>
        <div className="mt-3 border-t border-border pt-2.5">
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Aufhänger</h4>
          <ol
            aria-live="polite"
            aria-busy={pending}
            className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-x-6 gap-y-1.5 text-sm"
          >
            {briefing.hooks.map((hook, index) => (
              <li key={index} className="flex gap-2">
                <span className="w-4 shrink-0 font-bold tabular-nums text-muted">{index + 1}</span>
                <span>{hook}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {briefing.objectionHandling.length > 0 && (
        <section
          aria-label="Einwandbehandlung"
          className="rounded border border-border bg-surface px-4 py-3"
        >
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Einwandbehandlung
          </h3>
          <ul className="space-y-1.5 text-sm">
            {briefing.objectionHandling.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function InlineFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
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
