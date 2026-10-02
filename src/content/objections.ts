/** Entwurf, Abstimmung Vertrieb. */
export const OBJECTIONS = {
  version: '1',
  stand: '2026-10-02',
  items: [
    {
      id: 'has-provider',
      trigger: 'Wir haben schon einen Anbieter',
      response:
        'Verstehe. Bis wann läuft der Vertrag? Dann melde ich mich rechtzeitig vorher, damit Sie vergleichen können.',
      focus: 'contractEnd',
    },
    {
      id: 'buy-ourselves',
      trigger: 'Kein Bedarf, wir kaufen selbst',
      response: 'Wer wäscht und repariert die Kleidung bei Ihnen heute?',
      focus: 'currentSolution',
    },
    {
      id: 'send-documents',
      trigger: 'Schicken Sie mir Unterlagen',
      response:
        'Gern. Damit es die richtigen sind: Wie viele Mitarbeitende tragen Arbeitskleidung? Und wenn {hunterName} ohnehin am {tourtag} in der Nähe ist, zeigt er es Ihnen in 30 Minuten direkt vor Ort.',
      focus: 'wearers',
    },
    {
      id: 'no-time',
      trigger: 'Keine Zeit',
      response: 'Wann darf ich mich wieder melden?',
      focus: 'callback',
    },
    {
      id: 'head-office',
      trigger: 'Das regelt bei uns die Zentrale',
      response: 'Wer ist dort zuständig?',
      focus: 'contact',
    },
    {
      id: 'no-interest',
      trigger: 'Kein Interesse',
      response: 'Darf ich fragen, woran es liegt?',
      focus: 'notInterested',
    },
  ],
} as const;

export type ObjectionFocus = (typeof OBJECTIONS.items)[number]['focus'];
