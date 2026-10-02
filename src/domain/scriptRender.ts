import { SCRIPT_FALLBACKS, type ScriptToken } from '@/content/fallbacks';

export type ScriptContext = Partial<Record<ScriptToken, string | null>>;

function missing(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * Ersetzt die Platzhalter. Leere Werte werden zur neutralen Formulierung,
 * nie als „{name}“ sichtbar.
 */
export function renderScript(text: string, context: ScriptContext): string {
  let result = text;
  for (const phrase of SCRIPT_FALLBACKS.phrases) {
    if (missing(context[phrase.missing])) {
      result = result.replaceAll(phrase.pattern, phrase.replacement);
    }
  }
  for (const token of Object.keys(SCRIPT_FALLBACKS.tokens) as ScriptToken[]) {
    const value = context[token];
    const replacement =
      value !== null && value !== undefined && value.trim() !== ''
        ? value.trim()
        : SCRIPT_FALLBACKS.tokens[token];
    result = result.replaceAll(`{${token}}`, replacement);
  }
  return result.replace(/[ ]{2,}/g, ' ').trim();
}
