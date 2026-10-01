/** Einzahl oder Mehrzahl, etwa „1 Termin“ und „2 Termine“ */
export function noun(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Füllstand eines Fortschrittsbalkens in Prozent, auf 0 bis 100 begrenzt */
export function progressPercent(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, (value / goal) * 100));
}
