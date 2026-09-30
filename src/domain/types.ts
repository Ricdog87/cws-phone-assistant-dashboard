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
  lat: number;
  lng: number;
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
}

export interface Route {
  id: string;
  name: string;
  points: LatLng[];
}

/** Die vier Score-Dimensionen, je 0 bis 100 */
export interface Dimensions {
  fit: number;
  proximity: number;
  potential: number;
  reachability: number;
}

export type DimensionKey = keyof Dimensions;

/** Gewichte je Dimension. Rohwerte 0 bis 50, normiert Summe 100. */
export type Weights = Record<DimensionKey, number>;

export interface ScoredLead {
  lead: Lead;
  distanceKm: number;
  detourMinutes: number;
  inCorridor: boolean;
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
  distanceKm: number;
  detourMinutes: number;
  isControl: boolean;
  queuePosition: number;
  sourceId: string;
}
