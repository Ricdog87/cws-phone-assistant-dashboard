/** Entwurf, Abstimmung Vertrieb. */
export const CHECKLIST = {
  version: '1',
  stand: '2026-10-02',
  fields: [
    {
      id: 'contactRole',
      label: 'Gesprächspartner',
      required: true,
      options: [
        { value: 'decisionMaker', label: 'Entscheider' },
        { value: 'gatekeeper', label: 'Zentrale' },
        { value: 'other', label: 'Sonstige' },
      ],
    },
    {
      id: 'currentSolution',
      label: 'Heutige Lösung',
      required: true,
      options: [
        { value: 'rental', label: 'Mietservice' },
        { value: 'purchaseCompanyWash', label: 'Kauf, Firma wäscht' },
        { value: 'purchaseEmployeeWash', label: 'Kauf, Mitarbeitende waschen' },
        { value: 'none', label: 'Keine Arbeitskleidung' },
        { value: 'unknown', label: 'Unbekannt' },
      ],
    },
    {
      id: 'competitor',
      label: 'Anbieter',
      required: false,
      when: 'rental',
    },
    {
      id: 'contractEnd',
      label: 'Vertragsende',
      required: false,
      when: 'rental',
    },
    {
      id: 'wearers',
      label: 'Träger',
      required: true,
    },
    {
      id: 'requirements',
      label: 'Anforderungen',
      required: false,
    },
    {
      id: 'coDecisionMakers',
      label: 'Mitentscheider',
      required: false,
    },
    {
      id: 'decisionMakerAtMeeting',
      label: 'Entscheider beim Termin dabei',
      required: true,
      when: 'appointment',
    },
  ],
  statusLabels: {
    open: 'Offen',
    qualified: 'Qualifiziert',
    partial: 'Teilqualifiziert',
    unqualified: 'Nicht qualifiziert',
  },
  reasonLabels: {
    incomplete: 'Pflichtfelder fehlen',
    tooFewWearers: 'Zu wenig Träger',
    contractTooLong: 'Vertrag läuft zu lange',
    qualified: 'Entscheider dabei und Bedarf im Fenster',
    noDecisionMaker: 'Entscheider nicht dabei',
    contractEndUnknown: 'Vertragsende unbekannt',
    partial: 'Angaben reichen noch nicht',
  },
} as const;
