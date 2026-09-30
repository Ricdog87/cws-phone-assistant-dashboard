import branchen from './branchen.json';
import { detourMinutes, distanceToPolylineKm } from './geo';
import type { Band, DimensionKey, Dimensions, Lead, Route, ScoredLead, Weights } from './types';

export const DIMENSION_KEYS: readonly DimensionKey[] = [
  'fit',
  'proximity',
  'potential',
  'reachability',
];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  fit: 'Fit',
  proximity: 'Nähe',
  potential: 'Potenzial',
  reachability: 'Erreichbarkeit',
};

export const DEFAULT_WEIGHTS: Weights = { fit: 30, proximity: 30, potential: 25, reachability: 15 };
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 50;

export const BAND_A_MIN = 78;
export const BAND_B_MIN = 58;

export const DEFAULT_CORRIDOR_KM = 2;
export const CORRIDOR_MIN_KM = 1;
export const CORRIDOR_MAX_KM = 10;

/** Grundwerte aus branchen.json. Begründung und Status stehen dort. */
export const INDUSTRY_BASE_SCORES: Record<string, number> = Object.entries(branchen).reduce<
  Record<string, number>
>((scores, [industry, entry]) => {
  scores[industry] = entry.grundwert;
  return scores;
}, {});

/** Fallback für Branchen, die in branchen.json nicht vorkommen. */
export const INDUSTRY_FALLBACK_SCORE = 50;

export function industryBaseScore(industry: string): number {
  return INDUSTRY_BASE_SCORES[industry] ?? INDUSTRY_FALLBACK_SCORE;
}

/** Größenfaktor nach gewerblichen Mitarbeitenden */
export function sizeFactor(commercialEmployees: number): number {
  if (commercialEmployees >= 40 && commercialEmployees <= 250) return 1.0;
  if (
    (commercialEmployees >= 20 && commercialEmployees <= 39) ||
    (commercialEmployees >= 251 && commercialEmployees <= 399)
  ) {
    return 0.85;
  }
  return 0.6;
}

export function fitScore(lead: Pick<Lead, 'industry' | 'commercialEmployees'>): number {
  return Math.min(100, industryBaseScore(lead.industry) * sizeFactor(lead.commercialEmployees));
}

export function proximityScore(detour: number): number {
  return Math.max(0, 100 - (detour - 2) * 9);
}

export function potentialScore(wearerCount: number): number {
  return Math.min(100, wearerCount / 2.2);
}

export function reachabilityScore(
  lead: Pick<
    Lead,
    | 'hasDirectDial'
    | 'contactName'
    | 'openPositions'
    | 'certification'
    | 'siteExpansion'
    | 'managementChange'
  >,
): number {
  const sum =
    (lead.hasDirectDial ? 34 : 0) +
    (lead.contactName ? 26 : 0) +
    Math.min(22, lead.openPositions * 3.5) +
    (lead.certification ? 6 : 0) +
    (lead.siteExpansion ? 7 : 0) +
    (lead.managementChange ? 5 : 0);
  return Math.min(100, sum);
}

export function clampWeight(value: number): number {
  return Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, value));
}

/**
 * Normiert die Gewichte auf Summe 100. Sind alle Gewichte null,
 * werden die Dimensionen gleich gewichtet (je 25).
 */
export function normalizeWeights(weights: Weights): Weights {
  const clamped = {
    fit: clampWeight(weights.fit),
    proximity: clampWeight(weights.proximity),
    potential: clampWeight(weights.potential),
    reachability: clampWeight(weights.reachability),
  };
  const total = clamped.fit + clamped.proximity + clamped.potential + clamped.reachability;
  if (total === 0) return { fit: 25, proximity: 25, potential: 25, reachability: 25 };
  return {
    fit: (clamped.fit / total) * 100,
    proximity: (clamped.proximity / total) * 100,
    potential: (clamped.potential / total) * 100,
    reachability: (clamped.reachability / total) * 100,
  };
}

export function weightedScore(dimensions: Dimensions, weights: Weights): number {
  const w = normalizeWeights(weights);
  const sum = DIMENSION_KEYS.reduce((acc, key) => acc + (dimensions[key] * w[key]) / 100, 0);
  return Math.round(sum);
}

export function bandFor(score: number): Band {
  if (score >= BAND_A_MIN) return 'A';
  if (score >= BAND_B_MIN) return 'B';
  return 'C';
}

export function computeDimensions(lead: Lead, detour: number): Dimensions {
  return {
    fit: fitScore(lead),
    proximity: proximityScore(detour),
    potential: potentialScore(lead.wearerCount),
    reachability: reachabilityScore(lead),
  };
}

export function scoreLead(
  lead: Lead,
  route: Route,
  weights: Weights,
  corridorKm: number,
): ScoredLead {
  const distanceKm = distanceToPolylineKm(lead, route.points);
  const detour = detourMinutes(distanceKm);
  const dimensions = computeDimensions(lead, detour);
  const score = weightedScore(dimensions, weights);
  return {
    lead,
    distanceKm,
    detourMinutes: detour,
    inCorridor: distanceKm <= corridorKm,
    dimensions,
    score,
    band: bandFor(score),
  };
}

export function scoreLeads(
  leads: readonly Lead[],
  route: Route,
  weights: Weights,
  corridorKm: number,
): ScoredLead[] {
  return leads.map((lead) => scoreLead(lead, route, weights, corridorKm));
}
