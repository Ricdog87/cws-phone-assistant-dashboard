// Zentrale Typen der Fachlogik. Keine Abhängigkeit zu React, DOM oder Speicher.

export interface LatLng {
  lat: number;
  lng: number;
}

export type Band = 'A' | 'B' | 'C';

/** Rohdatensatz eines Unternehmens, unabhängig von der Quelle. */
export interface Lead {
  id: string;
  name: string;
  /** Branchenschlüssel, siehe src/domain/branchen.json */
  industry: string;
  street: string;
  postalCode: string;
  city: string;
  /** Nur für die Karte. Fehlt, wenn die Adresse nicht nachgeschlagen wurde. */
  lat: number | null;
  lng: number | null;
  /** Gewerbliche Mitarbeitende */
  commercialEmployees: number;
  /** Geschätzte Anzahl Träger von Berufskleidung */
  wearerCount: number;
  phone: string;
  hasDirectDial: boolean;
  contactName: string | null;
  contactRole: string | null;
  openPositions: number;
  certification: string | null;
  siteExpansion: boolean;
  managementChange: boolean;
  /** Bestandskunden erscheinen nur auf der Karte, nie in der Warteschlange */
  isCustomer: boolean;
  /** Accountinhaber in Salesforce, also der zuständige Hunter */
  owner?: string | null;
  /** Datum der letzten Aktivität in Salesforce, YYYY-MM-DD */
  lastActivity?: string | null;
}

/** Die drei Score-Dimensionen, je 0 bis 100 */
export interface Dimensions {
  fit: number;
  potential: number;
  reachability: number;
}

export type DimensionKey = keyof Dimensions;

/** Gewichte je Dimension. Rohwerte 0 bis 50, normiert Summe 100. */
export type Weights = Record<DimensionKey, number>;

export interface ScoredLead {
  lead: Lead;
  dimensions: Dimensions;
  score: number;
  band: Band;
}

export interface QueueEntry extends ScoredLead {
  /** Teil der Kontrollstichprobe aus Band B und C */
  isControl: boolean;
  /** Position in der Warteschlange, beginnend bei 1 */
  position: number;
}

export type OutcomeType = 'appointment' | 'callback' | 'not_reached' | 'not_interested';

export type ContactRole = 'decisionMaker' | 'gatekeeper' | 'other';

export type CurrentSolution =
  'rental' | 'purchaseCompanyWash' | 'purchaseEmployeeWash' | 'none' | 'unknown';

export type Requirement =
  'hygiene' | 'hiVis' | 'protective' | 'corporateWear' | 'washroomHygiene' | 'fireSafety';

export type CoDecisionMaker =
  'md' | 'purchasing' | 'safety' | 'hr' | 'worksCouncil' | 'plantManager';

export interface QualificationAnswers {
  contactRole: ContactRole | null;
  currentSolution: CurrentSolution | null;
  competitor: string | null;
  /** Monat des Vertragsendes, Format YYYY-MM */
  contractEnd: string | null;
  wearers: number | null;
  wearersSource: 'estimate' | 'call';
  requirements: Requirement[];
  coDecisionMakers: CoDecisionMaker[];
  decisionMakerAtMeeting: boolean | null;
  /** Höchstens 200 Zeichen, ohne Namen oder private Angaben */
  painPoint: string | null;
  updatedAt: string;
}

export type QualificationStatus = 'open' | 'qualified' | 'partial' | 'unqualified';

export interface ContactUpdate {
  id: string;
  leadId: string;
  /** Firmenname zum Zeitpunkt der Erfassung, für den Export */
  leadName: string;
  name: string | null;
  role: string | null;
  directDial: string | null;
  email: string | null;
  source: 'call';
  capturedAt: string;
}

/** Aktuelle Lösung für Berufskleidung, Auswahl aus dem Vertrieb */
export type CallSolution = 'companyBuys' | 'employeesBuy' | 'competitor' | 'none';

/**
 * Gesprächsprotokoll zum Anruf, alles auf einem Fleck: Gesprächspartner, aktuelle Lösung,
 * Merkmale und Notiz. Geht beim Speichern sofort und mit dem Ergebnis erneut als Aufgabe
 * „Anruf“ nach Salesforce, jedes Mal in dieselbe Aufgabe.
 */
export interface CallProtocol {
  /** Wer am Telefon war; Entscheider zählt als Nettokontakt */
  contactRole: ContactRole | null;
  solution: CallSolution | null;
  /** Anbieter bei Wettbewerb, Werte aus COMPETITORS */
  competitor: string | null;
  /** Vertrag beim Wettbewerb läuft bis, YYYY-MM; nur bei Wettbewerb, sonst leer */
  contractEnd: string | null;
  companyDissolved: boolean;
  centralDecision: boolean;
  existingCustomer: boolean;
  doNotCall: boolean;
  note: string | null;
}

/**
 * Gespräch mit gespeichertem Protokoll, dem noch das Ergebnis fehlt; je Lead höchstens eines.
 * Das Ergebnis übernimmt später die ID und damit dieselbe Aufgabe in Salesforce.
 */
export interface OpenCall {
  id: string;
  leadId: string;
  leadName: string;
  /** Accountinhaber des Leads beim Speichern */
  owner: string | null;
  protocol: CallProtocol;
  /** Zuletzt gespeichert */
  savedAt: string;
}

/** Wiedervorlage aus dem Cockpit; geht automatisch als Aufgabe nach Salesforce */
export interface Recall {
  id: string;
  leadId: string;
  leadName: string;
  /** Accountinhaber beim Anlegen */
  hunterName: string | null;
  reason: RecallReason;
  /** Fällig am, YYYY-MM-DD */
  dueDate: string;
  /** Uhrzeit HH:MM, nur bei vereinbartem Rückruf */
  dueTime: string | null;
  /** Vertragsende YYYY-MM, nur beim Grund Vertragsende */
  contractEnd: string | null;
  /** Notiz aus dem Gesprächsprotokoll */
  note: string | null;
  /** Gleich dem Zeitpunkt des Anrufergebnisses, das die Wiedervorlage angelegt hat */
  createdAt: string;
}

export interface HunterFeedback {
  appointmentId: string;
  happened: 'yes' | 'noShow' | 'rescheduled' | 'cancelled';
  fit: 'good' | 'partial' | 'poor' | null;
  reason:
    'tooSmall' | 'noDecisionMaker' | 'contractRunning' | 'noNeed' | 'wrongContact' | 'other' | null;
  ratedAt: string;
}

export type PilotArm = 'enriched' | 'standard';

export type RecallReason = 'contractEnd' | 'callback';

/** Ein erfasstes Anrufergebnis. Enthält alle Merkmale zum Zeitpunkt des Anrufs als Trainingsdaten. */
export interface CallOutcome {
  id: string;
  leadId: string;
  leadName: string;
  outcome: OutcomeType;
  recordedAt: string;
  band: Band;
  score: number;
  dimensions: Dimensions;
  normalizedWeights: Weights;
  /** Accountinhaber des Leads zum Zeitpunkt des Anrufs */
  owner?: string | null;
  isControl: boolean;
  queuePosition: number;
  sourceId: string;
  qualification?: QualificationAnswers;
  qualificationStatus?: QualificationStatus;
  contactUpdateId?: string | null;
  recallReason?: RecallReason | null;
  /** Gesprächsprotokoll aus der Maske */
  protocol?: CallProtocol;
  /** Nur im Pilot-Arm standard, Sekunden Recherche vor dem Anruf */
  researchSeconds?: number;
}
