import { DIMENSION_KEYS, WEIGHT_MAX, normalizeWeights } from './scoring';
import type { Band, CallOutcome, DimensionKey, Dimensions, Weights } from './types';

/** Erst ab dieser Zahl erfasster Anrufe wird ein Gewichtsvorschlag gerechnet */
export const MIN_CALLS_FOR_CALIBRATION = 300;
/** L2-Regularisierung der Koeffizienten, stabilisiert die Schätzung bei kleinen Datenmengen */
export const L2_PENALTY = 1;
export const MAX_ITERATIONS = 50;
export const CONVERGENCE_TOLERANCE = 1e-8;
/** Klassengrenzen je Dimension für die beobachtete Terminquote */
export const DIMENSION_BINS = [0, 25, 50, 75, 100] as const;

export interface RateCell {
  calls: number;
  appointments: number;
  /** Anteil Termine, 0 bis 1, null ohne Anrufe */
  rate: number | null;
}

export interface BinRate extends RateCell {
  from: number;
  to: number;
}

export interface Coefficient {
  estimate: number;
  standardError: number;
  /** Betrag größer als 1,96 Standardfehler */
  significant: boolean;
}

export interface WeightSuggestion {
  intercept: number;
  coefficients: Record<DimensionKey, Coefficient>;
  /** Vorgeschlagene Gewichte, Summe 100 */
  normalizedWeights: Weights;
  /** Dieselben Verhältnisse als Reglerwerte 0 bis 50 */
  rawWeights: Weights;
  /** Trennschärfe auf den erfassten Anrufen, 0,5 = Zufall, 1 = perfekt */
  aucCurrent: number;
  aucSuggested: number;
  iterations: number;
}

export type CalibrationStatus =
  'ok' | 'too_few_calls' | 'single_class' | 'no_positive_effect' | 'not_converged';

export interface CalibrationReport {
  calls: number;
  appointments: number;
  controlCalls: number;
  /** Fehlende Anrufe bis zur Mindestmenge */
  missingCalls: number;
  byBand: Record<Band, RateCell>;
  byDimension: Record<DimensionKey, BinRate[]>;
  status: CalibrationStatus;
  suggestion: WeightSuggestion | null;
}

const isAppointment = (o: CallOutcome): number => (o.outcome === 'appointment' ? 1 : 0);

export function rateCell(outcomes: readonly CallOutcome[]): RateCell {
  const calls = outcomes.length;
  const appointments = outcomes.reduce((sum, o) => sum + isAppointment(o), 0);
  return { calls, appointments, rate: calls === 0 ? null : appointments / calls };
}

/** Terminquote je Klasse einer Dimension. Die letzte Klasse schließt 100 ein. */
export function ratesByBin(outcomes: readonly CallOutcome[], key: DimensionKey): BinRate[] {
  return DIMENSION_BINS.slice(0, -1).map((from, i) => {
    const to = DIMENSION_BINS[i + 1] ?? 100;
    const last = i === DIMENSION_BINS.length - 2;
    const inBin = outcomes.filter((o) => {
      const v = o.dimensions[key];
      return v >= from && (last ? v <= to : v < to);
    });
    return { from, to, ...rateCell(inBin) };
  });
}

// Lineare Algebra für kleine, dichte Matrizen

type Matrix = number[][];

const at = (v: readonly number[], i: number): number => v[i] ?? 0;
const cell = (m: readonly (readonly number[])[], i: number, j: number): number => m[i]?.[j] ?? 0;
const zeros = (n: number): number[] => Array.from({ length: n }, () => 0);
const dot = (a: readonly number[], b: readonly number[]): number =>
  a.reduce((sum, v, i) => sum + v * at(b, i), 0);

/** Löst A x = b per Gauß-Jordan-Elimination mit Spaltenpivotsuche. null bei singulärer Matrix. */
export function solve(a: readonly (readonly number[])[], b: readonly number[]): number[] | null {
  const n = b.length;
  const m: Matrix = a.map((row, i) => [...row, at(b, i)]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(cell(m, r, col)) > Math.abs(cell(m, pivot, col))) pivot = r;
    }
    const pivotRow = m[pivot];
    const current = m[col];
    if (!pivotRow || !current || Math.abs(at(pivotRow, col)) < 1e-12) return null;
    m[col] = pivotRow;
    m[pivot] = current;
    for (let r = 0; r < n; r++) {
      const row = m[r];
      if (r === col || !row) continue;
      const factor = at(row, col) / at(pivotRow, col);
      for (let c = col; c <= n; c++) row[c] = at(row, c) - factor * at(pivotRow, c);
    }
  }
  return m.map((row, i) => at(row, n) / at(row, i));
}

export function invert(a: readonly (readonly number[])[]): Matrix | null {
  const n = a.length;
  const columns: number[][] = [];
  for (let j = 0; j < n; j++) {
    const col = solve(
      a,
      zeros(n).map((_, i) => (i === j ? 1 : 0)),
    );
    if (!col) return null;
    columns.push(col);
  }
  return zeros(n).map((_, i) => columns.map((col) => at(col, i)));
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

export interface LogisticFit {
  beta: number[];
  covariance: Matrix;
  iterations: number;
  converged: boolean;
}

/** Gradient und Hesse-Matrix der bestraften Log-Likelihood */
function derivatives(
  rows: readonly number[][],
  y: readonly number[],
  beta: readonly number[],
  lambda: number,
) {
  const k = beta.length;
  const gradient = beta.map((b, j) => (j === 0 ? 0 : -lambda * b));
  const hessian: Matrix = zeros(k).map((_, i) =>
    zeros(k).map((__, j) => (i === j && i > 0 ? lambda : 0)),
  );
  rows.forEach((row, n) => {
    const p = sigmoid(dot(row, beta));
    const w = p * (1 - p);
    const residual = at(y, n) - p;
    hessian.forEach((hRow, i) => {
      gradient[i] = at(gradient, i) + at(row, i) * residual;
      for (let j = 0; j < k; j++) hRow[j] = at(hRow, j) + w * at(row, i) * at(row, j);
    });
  });
  return { gradient, hessian };
}

/**
 * Logistische Regression per Newton-Verfahren mit L2-Strafterm auf allen
 * Koeffizienten außer dem Achsenabschnitt. x enthält keine Einserspalte.
 */
export function fitLogistic(
  x: readonly number[][],
  y: readonly number[],
  lambda: number = L2_PENALTY,
): LogisticFit | null {
  const rows = x.map((r) => [1, ...r]);
  let beta = zeros((x[0]?.length ?? 0) + 1);
  let converged = false;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS && !converged) {
    iterations++;
    const { gradient, hessian } = derivatives(rows, y, beta, lambda);
    const step = solve(hessian, gradient);
    if (!step) return null;
    beta = beta.map((b, j) => b + at(step, j));
    converged = Math.max(...step.map(Math.abs)) < CONVERGENCE_TOLERANCE;
  }

  // Kovarianz der Schätzung = Inverse der Hesse-Matrix am Optimum
  const covariance = invert(derivatives(rows, y, beta, lambda).hessian);
  return covariance ? { beta, covariance, iterations, converged } : null;
}

/** Fläche unter der ROC-Kurve (Mann-Whitney), Gleichstände zählen halb */
export function auc(scores: readonly number[], labels: readonly number[]): number {
  const sorted = scores.map((s, i) => ({ s, y: at(labels, i) })).sort((a, b) => a.s - b.s);
  let rankSumPositives = 0;
  let positives = 0;
  let i = 0;
  while (i < sorted.length) {
    const value = sorted[i]?.s;
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1]?.s === value) j++;
    const averageRank = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) {
      if (sorted[t]?.y === 1) {
        rankSumPositives += averageRank;
        positives++;
      }
    }
    i = j + 1;
  }
  const negatives = sorted.length - positives;
  if (positives === 0 || negatives === 0) return 0.5;
  return (rankSumPositives - (positives * (positives + 1)) / 2) / (positives * negatives);
}

/** Ungerundeter gewichteter Score, damit die AUC nicht durch Rundung verfälscht wird */
function linearScore(dimensions: Dimensions, weights: Weights): number {
  const w = normalizeWeights(weights);
  return DIMENSION_KEYS.reduce((sum, key) => sum + dimensions[key] * w[key], 0);
}

/** Reglerwerte 0 bis 50 mit denselben Verhältnissen, größtes Gewicht = 50 */
export function toRawWeights(normalized: Weights): Weights {
  const max = Math.max(...DIMENSION_KEYS.map((k) => normalized[k]));
  const scale = (v: number) => (max <= 0 ? 0 : Math.round((v / max) * WEIGHT_MAX));
  return {
    fit: scale(normalized.fit),
    proximity: scale(normalized.proximity),
    potential: scale(normalized.potential),
    reachability: scale(normalized.reachability),
  };
}

/**
 * Wertet die erfassten Anrufe aus und schlägt Gewichte vor. Zielgröße ist
 * „Termin vereinbart“ gegen alle anderen Ergebnisse. Der Vorschlag wird nie
 * automatisch angewendet.
 */
export function calibrate(
  outcomes: readonly CallOutcome[],
  currentWeights: Weights,
): CalibrationReport {
  const total = rateCell(outcomes);
  const base = {
    calls: total.calls,
    appointments: total.appointments,
    controlCalls: outcomes.filter((o) => o.isControl).length,
    missingCalls: Math.max(0, MIN_CALLS_FOR_CALIBRATION - total.calls),
    byBand: {
      A: rateCell(outcomes.filter((o) => o.band === 'A')),
      B: rateCell(outcomes.filter((o) => o.band === 'B')),
      C: rateCell(outcomes.filter((o) => o.band === 'C')),
    },
    byDimension: Object.fromEntries(
      DIMENSION_KEYS.map((key) => [key, ratesByBin(outcomes, key)]),
    ) as Record<DimensionKey, BinRate[]>,
  };

  if (total.calls < MIN_CALLS_FOR_CALIBRATION) {
    return { ...base, status: 'too_few_calls', suggestion: null };
  }
  if (total.appointments === 0 || total.appointments === total.calls) {
    return { ...base, status: 'single_class', suggestion: null };
  }

  const x = outcomes.map((o) => DIMENSION_KEYS.map((key) => o.dimensions[key] / 100));
  const y = outcomes.map(isAppointment);
  const fit = fitLogistic(x, y);
  if (!fit || !fit.converged) return { ...base, status: 'not_converged', suggestion: null };

  const coefficients = Object.fromEntries(
    DIMENSION_KEYS.map((key, i) => {
      const estimate = at(fit.beta, i + 1);
      const standardError = Math.sqrt(Math.max(0, cell(fit.covariance, i + 1, i + 1)));
      return [
        key,
        { estimate, standardError, significant: Math.abs(estimate) > 1.96 * standardError },
      ];
    }),
  ) as Record<DimensionKey, Coefficient>;

  // Negative Effekte erhalten Gewicht 0: der Score kennt keine Abzüge
  const positive = DIMENSION_KEYS.map((key) => Math.max(0, coefficients[key].estimate));
  const sum = positive.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...base, status: 'no_positive_effect', suggestion: null };

  const normalizedWeights = Object.fromEntries(
    DIMENSION_KEYS.map((key, i) => [key, (at(positive, i) / sum) * 100]),
  ) as Weights;

  return {
    ...base,
    status: 'ok',
    suggestion: {
      intercept: at(fit.beta, 0),
      coefficients,
      normalizedWeights,
      rawWeights: toRawWeights(normalizedWeights),
      aucCurrent: auc(
        outcomes.map((o) => linearScore(o.dimensions, currentWeights)),
        y,
      ),
      aucSuggested: auc(
        outcomes.map((o) => linearScore(o.dimensions, normalizedWeights)),
        y,
      ),
      iterations: fit.iterations,
    },
  };
}
