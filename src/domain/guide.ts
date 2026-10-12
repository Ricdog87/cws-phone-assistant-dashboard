import { LEITFADEN } from '@/content/leitfaden';
import { OBJECTIONS } from '@/content/objections';

/**
 * Gesprächsleitfaden für die Anrufliste: Phasen und Einwände aus src/content, die Platzhalter
 * mit den Daten des Leads gefüllt. Was erst im Gespräch feststeht, etwa Tag und Uhrzeit des
 * Termins, bleibt als Lücke stehen. Den Einstieg liefert das Briefing mit dem persönlichen
 * Einstiegssatz, deshalb fehlt die Phase Einstieg hier.
 */

/** Textstück; gap heißt, die Stelle füllt die Telefonassistenz im Gespräch */
export interface ScriptPart {
  text: string;
  gap: boolean;
}

export interface ScriptLine {
  id: string;
  parts: ScriptPart[];
}

export type GuideStepId = 'need' | 'objections' | 'appointment' | 'close' | 'switchboard';

export interface GuidePhase {
  id: Exclude<GuideStepId, 'objections'>;
  title: string;
  lines: ScriptLine[];
}

export interface GuideObjection {
  id: string;
  trigger: string;
  response: ScriptPart[];
}

export interface CallGuide {
  phases: GuidePhase[];
  objections: GuideObjection[];
}

export interface GuideContext {
  /** Name der anrufenden Telefonassistenz */
  callerName: string;
  contactName: string | null;
  contactRole: string | null;
  /** Zuständiger Hunter (Accountinhaber) */
  hunterName: string | null;
}

/** Reihenfolge der Reiter: nach dem Einstieg Bedarf oder Einwand, dann Termin und Abschluss */
export const GUIDE_STEPS: { id: GuideStepId; title: string }[] = [
  { id: 'need', title: 'Bedarf' },
  { id: 'objections', title: 'Einwände' },
  { id: 'appointment', title: 'Termin' },
  { id: 'close', title: 'Abschluss' },
  { id: 'switchboard', title: 'Zentrale' },
];

/** Beschriftung der Lücken, die erst im Gespräch feststehen */
const GAP_LABELS: Record<string, string> = {
  assistenzName: 'Ihr Name',
  anrede: 'Anrede',
  nachname: 'Name',
  funktion: 'Funktion',
  hunterName: 'Hunter',
  tourtag: 'Tag',
  slot1: 'Uhrzeit 1',
  slot2: 'Uhrzeit 2',
  mitentscheider: 'Mitentscheider',
  datenschutzLink: 'Link Datenschutz',
};

const SALUTATIONS = /^(Herr|Frau)\s+(.+)$/;

/** „Herr Ahlers“ als Anrede im Akkusativ und Nachname; ohne Anrede bleibt der ganze Name */
export function splitContactName(
  contactName: string | null,
): { salutation: string; lastName: string } | null {
  const name = contactName?.trim();
  if (!name) return null;
  const match = SALUTATIONS.exec(name);
  if (!match) return { salutation: '', lastName: name };
  return { salutation: match[1] === 'Herr' ? 'Herrn' : 'Frau', lastName: match[2] ?? '' };
}

/** Füllt {platzhalter} aus values; fehlende Werte werden zu Lücken */
export function fillScript(
  template: string,
  values: Readonly<Record<string, string | null | undefined>>,
): ScriptPart[] {
  const parts: ScriptPart[] = [];
  const push = (text: string, gap: boolean) => {
    const last = parts[parts.length - 1];
    if (last && !last.gap && !gap) last.text += text;
    else parts.push({ text, gap });
  };
  let index = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    push(template.slice(index, match.index), false);
    const key = match[1] ?? '';
    const value = values[key];
    if (value === '') {
      // Leere Anrede: kein Text, keine Lücke
    } else if (value) push(value, false);
    else push(GAP_LABELS[key] ?? key, true);
    index = (match.index ?? 0) + match[0].length;
  }
  push(template.slice(index), false);
  return parts
    .map((part) => (part.gap ? part : { ...part, text: part.text.replace(/\s{2,}/g, ' ') }))
    .filter((part) => part.text !== '');
}

/** Leitfaden für einen Lead: Phasen ohne Einstieg und die Standard-Einwände */
export function callGuide(context: GuideContext): CallGuide {
  const contact = splitContactName(context.contactName);
  const values: Record<string, string | null> = {
    assistenzName: context.callerName.trim() || null,
    anrede: contact ? contact.salutation : null,
    nachname: contact?.lastName ?? null,
    funktion: context.contactRole?.trim() || null,
    hunterName: context.hunterName?.trim() || null,
  };
  const phases = LEITFADEN.phases
    .filter((phase) => phase.id !== 'opening')
    .map((phase) => ({
      id: phase.id as GuidePhase['id'],
      title: phase.title,
      lines: phase.lines
        // Ohne bekannten Ansprechpartner nur die offene Frage an die Zentrale
        .filter((line) => contact || line.id !== 'switchboard-named')
        .map((line) => ({ id: line.id, parts: fillScript(line.text, values) })),
    }));
  const objections = OBJECTIONS.items.map((item) => ({
    id: item.id,
    trigger: item.trigger,
    response: fillScript(item.response, values),
  }));
  return { phases, objections };
}
