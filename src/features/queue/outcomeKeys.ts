import type { OutcomeType } from '@/domain/types';

/**
 * Ergebnisse auf den Tasten 1 bis 3. Einen Termin bucht die Telefonassistenz direkt in
 * Salesforce; im Cockpit zählt ihn nur der kleine Knopf „Termin gebucht“ für die Kennzahlen.
 */
export const KEYED_OUTCOMES: readonly OutcomeType[] = ['callback', 'not_reached', 'not_interested'];
