import branchen from './branchen.json';
import type { Band, DimensionKey, Dimensions, Lead, ScoredLead, Weights } from './types';

export const DIMENSION_KEYS: readonly DimensionKey[] = ['fit', 'potential', 'reachability'];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  fit: 'Fit',
  potential: 'Potenzial',
  reachability: 'Erreichbarkeit',
};

/** Ohne Routenplanung entfällt die Nähe. Die übrigen Gewichte behalten ihr Verhältnis. */
export const DEFAULT_WEIGHTS: Weights = { fit: 30, potential: 25, reachability: 15 };
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 50;

export const BAND_A_MIN = 78;
export const BAND_B_MIN = 58;

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
 * werden die Dimensionen gleich gewichtet.
 */
export function normalizeWeights(weights: Weights): Weights {
  const clamped = DIMENSION_KEYS.map((key) => [key, clampWeight(weights[key])] as const);
  const total = clamped.reduce((sum, [, value]) => sum + value, 0);
  return Object.fromEntries(
    clamped.map(([key, value]) => [
      key,
      total === 0 ? 100 / DIMENSION_KEYS.length : (value / total) * 100,
    ]),
  ) as Weights;
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

export function computeDimensions(lead: Lead): Dimensions {
  return {
    fit: fitScore(lead),
    potential: potentialScore(lead.wearerCount),
    reachability: reachabilityScore(lead),
  };
}

export function scoreLead(lead: Lead, weights: Weights): ScoredLead {
  const dimensions = computeDimensions(lead);
  const score = weightedScore(dimensions, weights);
  return { lead, dimensions, score, band: bandFor(score) };
}

export function scoreLeads(leads: readonly Lead[], weights: Weights): ScoredLead[] {
  return leads.map((lead) => scoreLead(lead, weights));
}
