/** Entwurf, Abstimmung Vertrieb. */
export const LEITFADEN = {
  version: '1',
  stand: '2026-10-02',
  phases: [
    {
      id: 'switchboard',
      title: 'Zentrale',
      lines: [
        {
          id: 'switchboard-named',
          text: 'Guten Tag, {assistenzName} von CWS. Ich möchte gern {anrede} {nachname} aus der {funktion} sprechen.',
        },
        {
          id: 'switchboard-open',
          text: 'Guten Tag, {assistenzName} von CWS. Wer kümmert sich bei Ihnen um die Arbeitskleidung der Mitarbeitenden, eher die Betriebsleitung oder der Einkauf?',
        },
      ],
      hint: 'Namen und Durchwahl sofort im Feld Kontakt erfasst eintragen.',
    },
    {
      id: 'opening',
      title: 'Einstieg',
      lines: [
        {
          id: 'opening-decision',
          text: '{anrede} {nachname}, {assistenzName} von CWS, wir sind Mietservice für Berufskleidung. Ich rufe an, weil {aufhaenger}. Haben Sie zwei Minuten?',
        },
        {
          id: 'opening-later',
          text: 'Wann passt es Ihnen besser?',
        },
      ],
      hint: 'Bei Nein die Wiedervorlage über Taste 2 setzen.',
    },
    {
      id: 'need',
      title: 'Bedarf',
      lines: [
        { id: 'need-solution', text: 'Wie ist das Thema Arbeitskleidung bei Ihnen heute gelöst?' },
        {
          id: 'need-contract',
          text: 'Mit wem arbeiten Sie da zusammen, und bis wann läuft der Vertrag?',
        },
        { id: 'need-wearers', text: 'Wie viele Mitarbeitende tragen bei Ihnen Arbeitskleidung?' },
        {
          id: 'need-requirements',
          text: 'Gibt es besondere Anforderungen, zum Beispiel Hygiene, Warnschutz oder Ihr Logo?',
        },
        { id: 'need-pain', text: 'Was läuft heute nicht so, wie Sie es sich wünschen?' },
        { id: 'need-others', text: 'Wer entscheidet bei dem Thema außer Ihnen mit?' },
      ],
      hint: 'Die Checkliste läuft in dieser Reihenfolge mit.',
    },
    {
      id: 'appointment',
      title: 'Termin',
      lines: [
        {
          id: 'appointment-slots',
          text: 'Unser Kollege {hunterName} ist am {tourtag} ohnehin bei Ihnen in der Gegend. Passt Ihnen {slot1} oder eher {slot2}?',
        },
        {
          id: 'appointment-decision',
          text: 'Damit es sich für Sie lohnt: Kann {mitentscheider} beim Termin dabei sein?',
        },
      ],
      hint: 'Die Antwort setzt das Feld, ob der Entscheider beim Termin dabei ist.',
    },
    {
      id: 'close',
      title: 'Abschluss',
      lines: [
        {
          id: 'close-repeat',
          text: 'Ich wiederhole kurz: {tourtag}, {slot1}, {hunterName} kommt zu Ihnen.',
        },
        {
          id: 'close-contact',
          text: 'Unter welcher Durchwahl und E-Mail erreichen wir Sie für die Bestätigung?',
        },
        {
          id: 'close-privacy',
          text: 'Die Hinweise zum Datenschutz finden Sie unter {datenschutzLink}.',
        },
      ],
      hint: 'Den Datenschutzsatz stimmt die Rechtsabteilung noch ab.',
    },
  ],
  hooks: {
    positions: 'Sie gerade gewerbliche Stellen besetzen',
    expansion: 'Sie den Standort erweitern',
    management: 'die Geschäftsführung gewechselt hat',
    hunter: 'unser Kollege am {tourtag} ohnehin in Ihrer Nähe ist',
    reference: 'weitere Betriebe aus der Branche {branche} in der Nähe bereits betreut werden',
    industry: '{aufhaenger}',
  },
} as const;

export type GuidePhaseId = (typeof LEITFADEN.phases)[number]['id'];
export type GuideHookKind = keyof typeof LEITFADEN.hooks;
