import { useState } from 'react';
import { GUIDE_STEPS, type CallGuide, type GuideStepId, type ScriptPart } from '@/domain/guide';

interface CallGuideProps {
  guide: CallGuide;
  /** Einwandbehandlung des Sprachmodells für diesen Betrieb, sonst leer */
  extraObjections: readonly string[];
}

/** Text mit Lücken; eine Lücke füllt die Telefonassistenz im Gespräch */
export function ScriptText({ parts }: { parts: readonly ScriptPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.gap ? (
          <span
            key={index}
            className="mx-0.5 whitespace-nowrap rounded border border-dashed border-muted px-1.5 text-[0.85em] text-muted"
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Leitfaden nach dem Einstieg: Bedarf, Einwände, Termin, Abschluss und Zentrale als Reiter */
export function CallGuidePanel({ guide, extraObjections }: CallGuideProps) {
  const [step, setStep] = useState<GuideStepId>('need');
  const phase = guide.phases.find((item) => item.id === step);

  return (
    <section aria-label="Gesprächsleitfaden" className="rounded border border-border bg-panel">
      <div
        role="tablist"
        aria-label="Phasen des Gesprächs"
        className="flex gap-1 overflow-x-auto border-b border-border px-2"
      >
        {GUIDE_STEPS.map((item) => {
          const selected = item.id === step;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`leitfaden-${item.id}`}
              aria-selected={selected}
              aria-controls="leitfaden-inhalt"
              onClick={() => setStep(item.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-bold ${
                selected
                  ? 'border-brand-primary text-brand-ink'
                  : 'border-transparent text-muted hover:text-brand-ink'
              }`}
            >
              {item.title}
              {item.id === 'objections' && (
                <span className="ml-1.5 font-normal text-muted">
                  {guide.objections.length + extraObjections.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        id="leitfaden-inhalt"
        role="tabpanel"
        aria-labelledby={`leitfaden-${step}`}
        className="px-4 py-3"
      >
        {step === 'objections' ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {extraObjections.map((text, index) => (
              <div
                key={`extra-${index}`}
                className="rounded border border-brand-ink px-3 py-2 text-sm leading-relaxed"
              >
                <p className="mb-0.5 text-xs font-bold text-muted">Für diesen Betrieb</p>
                {text}
              </div>
            ))}
            {guide.objections.map((item) => (
              <div key={item.id} className="rounded border border-border px-3 py-2">
                <p className="text-sm font-bold">„{item.trigger}“</p>
                <p className="mt-0.5 text-sm leading-relaxed">
                  <ScriptText parts={item.response} />
                </p>
              </div>
            ))}
          </div>
        ) : (
          <ol className="space-y-2.5">
            {phase?.lines.map((line, index) => (
              <li key={line.id} className="flex gap-3 text-[15px] leading-relaxed">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted"
                >
                  {index + 1}
                </span>
                <span>
                  <ScriptText parts={line.parts} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
