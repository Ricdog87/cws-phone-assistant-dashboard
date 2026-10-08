import { createRandom } from '@/domain/sampling';
import { DEFAULT_WEIGHTS, bandFor, weightedScore } from '@/domain/scoring';
import type { CallOutcome, Dimensions } from '@/domain/types';
import { makeOutcome } from './fixtures';

export function outcomeFor(i: number, dimensions: Dimensions, appointment: boolean): CallOutcome {
  const score = weightedScore(dimensions, DEFAULT_WEIGHTS);
  return makeOutcome({
    id: `O-${i}`,
    leadId: `L-${i}`,
    dimensions,
    score,
    band: bandFor(score),
    outcome: appointment ? 'appointment' : 'not_interested',
    isControl: i % 12 === 0,
  });
}

/** Simulierte Anrufe mit bekanntem Zusammenhang: Fit wirkt stark, Potenzial gar nicht */
export function simulate(n: number, seed = 42): CallOutcome[] {
  const random = createRandom(seed);
  return Array.from({ length: n }, (_, i) => {
    const d: Dimensions = {
      fit: random() * 100,
      potential: random() * 100,
      reachability: random() * 100,
    };
    const logit = -3 + 3 * (d.fit / 100) + 0 * (d.potential / 100) + 1 * (d.reachability / 100);
    return outcomeFor(i, d, random() < 1 / (1 + Math.exp(-logit)));
  });
}
