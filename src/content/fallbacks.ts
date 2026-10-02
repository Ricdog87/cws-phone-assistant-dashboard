/** Entwurf, Abstimmung Vertrieb. Neutrale Formulierungen, wenn ein Platzhalter leer ist. */
export const SCRIPT_FALLBACKS = {
  version: '1',
  stand: '2026-10-02',
  tokens: {
    assistenzName: 'CWS',
    anrede: '',
    nachname: 'die zuständige Person',
    funktion: 'der zuständigen Stelle',
    firma: 'Ihrem Unternehmen',
    ort: 'Ihnen vor Ort',
    branche: 'Ihrer Branche',
    hunterName: 'unser Kollege',
    tourtag: 'dem nächsten Tourtag',
    aufhaenger: 'wir Mietservice für Berufskleidung anbieten',
  },
  /** Längere Muster zuerst ersetzen, damit die Anrede nicht vor dem Namen stehen bleibt. */
  phrases: [
    { pattern: 'Herrn {nachname}', missing: 'nachname', replacement: 'die zuständige Person' },
    { pattern: 'Frau {nachname}', missing: 'nachname', replacement: 'die zuständige Person' },
    { pattern: '{anrede} {nachname}', missing: 'nachname', replacement: 'die zuständige Person' },
  ],
} as const;

export type ScriptToken = keyof typeof SCRIPT_FALLBACKS.tokens;
