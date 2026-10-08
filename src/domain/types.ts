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

/** Vereinbarter Vor-Ort-Termin, Grundlage für Bestätigung und Rückweg nach Salesforce */
export interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  /** Beginn als ISO-Zeitpunkt in UTC */
  start: string;
  durationMinutes: number;
  hunterName: string;
  hunterEmail: string | null;
  contactName: string | null;
  contactEmail: string | null;
  /** Adresse des Termins, einzeilig */
  location: string;
  createdAt: string;
  /** Zeitpunkt, an dem die Bestätigungs-E-Mail geöffnet wurde */
  confirmationOpenedAt?: string | null;
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
  /** Nur im Pilot-Arm standard, Sekunden Recherche vor dem Anruf */
  researchSeconds?: number;
}
