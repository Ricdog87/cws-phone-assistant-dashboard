/**
 * Demo-Ebenen für den internationalen Rollout.
 * Später bestimmt das Login die Ebene. Die Bezeichnungen bleiben an einer Stelle.
 */
export const VIEW_LEVELS = ['assistant', 'teamLead', 'director'] as const;
export type ViewLevel = (typeof VIEW_LEVELS)[number];

export const VIEW_LEVEL_LABELS: Record<ViewLevel, string> = {
  assistant: 'Telefonassistenz',
  teamLead: 'Teamleitung',
  director: 'Vertriebsleitung',
};

/** Telefonassistenz in Martinas Team. Die Anrufliste gehört zu diesem Zugang. */
export const DEMO_USER = {
  givenName: 'Nele',
  familyName: 'Faber',
  fullName: 'Nele Faber',
  role: VIEW_LEVEL_LABELS.assistant,
} as const;

export const DEMO_PERSONAS: Record<
  ViewLevel,
  { givenName: string; familyName: string; fullName: string; role: string }
> = {
  assistant: DEMO_USER,
  teamLead: {
    givenName: 'Martina',
    familyName: 'Weidmann',
    fullName: 'Martina Weidmann',
    role: VIEW_LEVEL_LABELS.teamLead,
  },
  director: {
    givenName: 'Steffen',
    familyName: 'Sixthor',
    fullName: 'Steffen Sixthor',
    // Positionsbezeichnung laut Organigramm, die Ebene bleibt Vertriebsleitung
    role: 'Head of Sales New Business',
  },
};

export function userInitials(givenName: string, familyName: string): string {
  return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
}

/** Tageszeitliche Begrüßung, passend zur lokalen Uhr. */
export function daypartGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}
