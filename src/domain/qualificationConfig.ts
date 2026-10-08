/** Annahme, Abstimmung offen. */

/** Unter dieser Trägerzahl ist ein Termin nicht qualifiziert. */
export const MIN_WEARERS = 15;

/** Mietvertrag, der weiter als diese Spanne nach dem Termin liegt, ist nicht qualifiziert. */
export const CONTRACT_WINDOW_MONTHS = 18;

/** So viele Monate vor dem Vertragsende liegt die Wiedervorlage. */
export const CONTRACT_RECALL_MONTHS_BEFORE = 9;

/** Signale älter als diese Spanne zählen nicht als Aufhänger. */
export const SIGNAL_FRESH_DAYS = 60;

/** So viele Bestandskunden derselben Branche braucht der Referenz-Aufhänger. */
export const REFERENCE_MIN_COUNT = 2;

/** Abstände zwischen Anrufen zählen höchstens so viele Minuten als Telefonzeit. */
export const IDLE_CAP_MINUTES = 10;

/** Darunter zeigt eine Kennzahl „zu wenig Daten“. */
export const MIN_SAMPLE = 30;

/** Wettbewerber im Mietservice, Liste aus dem Vertrieb (Stand 08.10.2026). */
export const COMPETITORS = ['MEWA', 'Bardusch', 'DBL', 'Alsco', 'Sonstiger', 'Unbekannt'] as const;

/** Obergrenze aus dem Datenmodell, nicht eine eigene Fachregel. */
export const PAIN_POINT_MAX_LENGTH = 200;
