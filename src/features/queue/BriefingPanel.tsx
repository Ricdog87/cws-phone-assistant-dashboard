import { useMemo, type ReactNode } from 'react';
import { useContactLink, useSalesforceLink } from '@/app/salesforceLinks';
import { SalesforceLink } from '@/components/SalesforceLink';
import { BandBadge } from '@/components/BandBadge';
import { ControlTag } from '@/components/ControlTag';
import { Meter } from '@/components/Meter';
import { todayLocal } from '@/app/selectors';
import { formatInt } from '@/components/format';
import { activityLabel, daysSinceActivity } from '@/domain/activity';
import { buildBriefing, contactLabel } from '@/domain/briefing';
import { callGuide } from '@/domain/guide';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/domain/scoring';
import type { QueueEntry } from '@/domain/types';
import { RecallTask } from '@/features/recalls/RecallTask';
import { useOpenRecall } from '@/features/recalls/useRecalls';
import { CallGuidePanel } from './CallGuide';
import { ContactCapture } from './ContactCapture';
import { useBriefing } from './useBriefing';

interface BriefingPanelProps {
  entry: QueueEntry;
  /** Name der anrufenden Person für den Einstiegssatz */
  callerName: string;
}

/**
 * Briefing als Call-Cockpit. Links, was gesagt wird: Einstiegssatz mit Aufhängern, darunter
 * der Leitfaden mit Bedarf, Einwänden, Termin, Abschluss und Zentrale. Rechts, wer und wo:
 * Ansprechpartner mit Telefon, Firmendaten und Bewertung.
 */
export function BriefingPanel({ entry, callerName }: BriefingPanelProps) {
  const { lead } = entry;
  const salesforceLink = useSalesforceLink();
  const recall = useOpenRecall(lead.id);
  const { briefing, pending } = useBriefing(entry);
  // Regelbasiert mit dem Namen der Anruferin statt Platzhalter
  const named = buildBriefing(entry, callerName);
  const openingLine = briefing.source === 'rules' ? named.openingLine : briefing.openingLine;
  const guide = useMemo(
    () =>
      callGuide({
        callerName,
        contactName: lead.contactName,
        contactRole: lead.contactRole,
        hunterName: lead.owner ?? null,
      }),
    [callerName, lead.contactName, lead.contactRole, lead.owner],
  );

  return (
    <article aria-label={`Briefing ${lead.name}`} className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <BandBadge band={entry.band} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold leading-tight">
              <SalesforceLink target={salesforceLink(lead.id)}>{lead.name}</SalesforceLink>
            </h2>
            {entry.isControl && <ControlTag />}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {lead.industry || 'Branche unbekannt'} · {lead.city}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted">Score</div>
          <div className="text-3xl font-bold leading-none tabular-nums">{entry.score}</div>
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {recall && <RecallTask key={`wv-${recall.id}`} recall={recall} />}

          <section
            aria-label="Einstieg"
            className="rounded border-2 border-brand-ink bg-panel px-5 py-4"
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Einstieg</h3>
              <span className="text-xs text-muted">
                {briefingSourceText(briefing.source, briefing.fallbackReason, pending)}
              </span>
            </div>
            <p className="text-[17px] leading-relaxed">{openingLine}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wide text-muted">
                Aufhänger
              </span>
              <ol aria-live="polite" aria-busy={pending} className="contents">
                {briefing.hooks.map((hook, index) => (
                  <li
                    key={index}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
                  >
                    {hook}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <CallGuidePanel
            key={`leitfaden-${lead.id}`}
            guide={guide}
            extraObjections={briefing.objectionHandling}
          />
        </div>

        <aside aria-label="Firma und Ansprechpartner" className="flex flex-col gap-4">
          <ContactCard entry={entry} />
          <Card title="Firma">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <Fact label="Branche">{lead.industry || 'unbekannt'}</Fact>
              <Fact label="Adresse">
                {lead.street && <span className="block">{lead.street}</span>}
                {[lead.postalCode, lead.city].filter(Boolean).join(' ')}
              </Fact>
              <Fact label="Mitarbeitende">{formatInt(lead.commercialEmployees)}</Fact>
              <Fact label="Träger">{formatInt(lead.wearerCount)}</Fact>
              <Fact label="Hunter">{lead.owner ?? 'nicht zugeordnet'}</Fact>
              <Fact label="Letzte Aktivität">
                {activityLabel(daysSinceActivity(lead.lastActivity, todayLocal()))}
              </Fact>
            </dl>
          </Card>
          <Card title="Bewertung">
            <div aria-label="Dimensionen" className="space-y-2.5">
              {DIMENSION_KEYS.map((key) => (
                <Meter key={key} label={DIMENSION_LABELS[key]} value={entry.dimensions[key]} />
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </article>
  );
}

/** Ansprechpartner mit Link nach Salesforce, Telefon zum Anklicken und Kontakt erfassen */
function ContactCard({ entry }: { entry: QueueEntry }) {
  const { lead } = entry;
  const contactLink = useContactLink();
  const phoneHref = lead.phone?.replace(/\s/g, '') ?? '';
  return (
    <Card title="Ansprechpartner" label="Ansprechpartner">
      {lead.contactName ? (
        <>
          <p className="text-base font-bold leading-snug">
            <SalesforceLink target={contactLink(lead)}>{lead.contactName}</SalesforceLink>
          </p>
          {lead.contactRole && <p className="text-sm text-muted">{lead.contactRole}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">{contactLabel(entry)}</p>
      )}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        {lead.phone ? (
          <>
            <a
              href={`tel:${phoneHref}`}
              className="text-lg font-bold tabular-nums text-brand-ink underline decoration-border underline-offset-4 hover:decoration-brand-ink"
            >
              {lead.phone}
            </a>
            <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-muted">
              {lead.hasDirectDial ? 'Durchwahl' : 'Zentrale'}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">Keine Telefonnummer</span>
        )}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <ContactCapture key={`kontakt-${lead.id}`} lead={lead} />
      </div>
    </Card>
  );
}

function Card({ title, label, children }: { title: string; label?: string; children: ReactNode }) {
  return (
    <section
      aria-label={label ?? title}
      className="rounded border border-border bg-panel px-4 py-3"
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
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
