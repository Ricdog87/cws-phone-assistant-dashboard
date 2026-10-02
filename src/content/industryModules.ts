/** Entwurf, Abstimmung Vertrieb. */
export const INDUSTRY_MODULES = {
  version: '1',
  stand: '2026-10-02',
  general: [
    'Holen und Bringen, Waschen, Reparieren und Ersetzen liegen bei uns.',
    'Bei einem Personalwechsel sind die passenden Größen da, ohne Kapital im Kleiderlager zu binden.',
  ],
  modules: [
    {
      id: 'food',
      industries: ['Fleischverarbeitung', 'Lebensmittelproduktion'],
      hook: 'hygienegerechte Aufbereitung und ein fester Wechselrhythmus für Sie wichtig sind',
      benefits: [
        'Die Aufbereitung ist auf Hygienebetriebe ausgerichtet.',
        'Der Wechselrhythmus bleibt fest, auch wenn die Schicht wechselt.',
      ],
    },
    {
      id: 'metal',
      industries: ['Metallbau', 'Maschinenbau', 'Bau'],
      hook: 'Schutzkleidung und Warnschutz im Betrieb laufend repariert und ersetzt werden müssen',
      benefits: [
        'Schutz- und Warnschutzkleidung wird repariert und ausgetauscht.',
        'Neue Mitarbeitende sind ausgestattet, ohne dass Sie ein Lager führen.',
      ],
    },
    {
      id: 'logistics',
      industries: ['Logistik'],
      hook: 'neue Mitarbeitende schnell Warnschutz brauchen',
      benefits: [
        'Warnschutz ist ab dem ersten Tag da.',
        'Neue Mitarbeitende sind schnell ausgestattet.',
      ],
    },
    {
      id: 'care',
      industries: ['Gesundheit und Pflege'],
      hook: 'Hygiene und Bereichskleidung im Alltag mitlaufen müssen',
      benefits: [
        'Die Aufbereitung folgt dem Hygienemaßstab des Betriebs.',
        'Bereichskleidung bleibt getrennt und wird ersetzt, wenn sie verschlissen ist.',
      ],
    },
    {
      id: 'automotive',
      industries: ['Kfz-Werkstatt'],
      hook: 'robuste Kleidung und ein einheitlicher Auftritt mit Logo zusammengehören',
      benefits: [
        'Die Kleidung hält den Werkstattalltag aus.',
        'Das Logo sitzt einheitlich, auch nach dem Wechsel von Mitarbeitenden.',
      ],
    },
    {
      id: 'chemistry',
      industries: ['Chemie'],
      hook: 'die Schutzkleidung zur Anforderung des Betriebs passen muss',
      benefits: [
        'Die Schutzkleidung richtet sich nach der Anforderung des Betriebs.',
        'Reparatur und Ersatz laufen mit, ohne eigenes Lager.',
      ],
    },
  ],
  other: {
    id: 'other',
    hook: 'ein Mietservice das Waschen, Reparieren und Ersetzen übernehmen kann',
    benefits: [
      'Holen und Bringen, Waschen, Reparieren und Ersetzen liegen bei uns.',
      'Bei einem Personalwechsel sind die passenden Größen da.',
    ],
  },
} as const;
