import type { CallOutcome } from './types';

/** Vereinbarte Termine je Vertriebswoche, Montag bis Freitag. */
export const WEEKLY_APPOINTMENT_GOAL = 4;

/** Arbeitstage der Vertriebswoche, Montag bis Freitag. */
export const SALES_WEEK_DAYS = 5;

/** Anrufe je Arbeitstag. Richtwert, kein Terminziel. */
export const DAILY_CALL_GOAL = 50;

export interface PeriodCounts {
  calls: number;
  appointments: number;
}

export interface GoalProgress {
  day: PeriodCounts;
  week: PeriodCounts;
  weeklyAppointmentGoal: number;
  dailyCallGoal: number;
  /** Fehlende Termine bis zum Wochenziel, nicht unter 0. */
  appointmentsRemaining: number;
  /** Fehlende Anrufe bis zum Tagesziel, nicht unter 0. */
  callsRemaining: number;
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Montag 00:00 Ortszeit der Woche, in der `now` liegt. */
function startOfLocalWeek(now: Date): Date {
  const start = startOfLocalDay(now);
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

const WEEKDAY_NAMES = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const;

export interface CallDay {
  weekday: string;
  /** TT.MM.JJJJ */
  dateLabel: string;
  /** Montag bis Freitag; Samstag und Sonntag gehören nicht zur Vertriebswoche. */
  workday: boolean;
  /** Arbeitstage einschließlich heute bis einschließlich Freitag, am Wochenende 0. */
  daysRemaining: number;
  /** Freitag der laufenden Vertriebswoche, am Wochenende der gerade vergangene. */
  weekEndLabel: string;
  /** Montag der nächsten Vertriebswoche. */
  nextWeekStartLabel: string;
}

function formatDeDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

/** Kalendertag und restliche Arbeitstage der Vertriebswoche bis Freitag. */
export function callDay(now: Date = new Date()): CallDay {
  const start = startOfLocalDay(now);
  const weekdayIndex = start.getDay();
  const monday = startOfLocalWeek(now);
  const workday = weekdayIndex >= 1 && weekdayIndex <= SALES_WEEK_DAYS;
  return {
    weekday: WEEKDAY_NAMES[weekdayIndex] ?? 'Sonntag',
    dateLabel: formatDeDate(start),
    workday,
    daysRemaining: workday ? SALES_WEEK_DAYS + 1 - weekdayIndex : 0,
    weekEndLabel: formatDeDate(addDays(monday, SALES_WEEK_DAYS - 1)),
    nextWeekStartLabel: formatDeDate(addDays(monday, 7)),
  };
}

function inRange(iso: string, fromMs: number, toMs: number): boolean {
  const timestamp = Date.parse(iso);
  return !Number.isNaN(timestamp) && timestamp >= fromMs && timestamp < toMs;
}

function countPeriod(outcomes: readonly CallOutcome[], fromMs: number, toMs: number): PeriodCounts {
  let calls = 0;
  let appointments = 0;
  for (const outcome of outcomes) {
    if (!inRange(outcome.recordedAt, fromMs, toMs)) continue;
    calls += 1;
    if (outcome.outcome === 'appointment') appointments += 1;
  }
  return { calls, appointments };
}

/**
 * Zählfenster der Vertriebswoche, Montag 00:00 bis Montag 00:00 Ortszeit, als Zeitstempel in
 * Millisekunden. Was ausnahmsweise am Wochenende erfasst wird, zählt zur Woche davor.
 */
export function localWeekRange(now: Date = new Date()): { from: number; to: number } {
  const start = startOfLocalWeek(now);
  return { from: start.getTime(), to: addDays(start, 7).getTime() };
}

/** Tages- und Wochenstand aus den erfassten Anrufergebnissen. Jedes Ergebnis zählt als ein Anruf. */
export function goalProgress(
  outcomes: readonly CallOutcome[],
  now: Date = new Date(),
): GoalProgress {
  const dayStart = startOfLocalDay(now).getTime();
  const weekStart = startOfLocalWeek(now).getTime();
  const day = countPeriod(outcomes, dayStart, addDays(new Date(dayStart), 1).getTime());
  const week = countPeriod(outcomes, weekStart, addDays(new Date(weekStart), 7).getTime());
  return {
    day,
    week,
    weeklyAppointmentGoal: WEEKLY_APPOINTMENT_GOAL,
    dailyCallGoal: DAILY_CALL_GOAL,
    appointmentsRemaining: Math.max(0, WEEKLY_APPOINTMENT_GOAL - week.appointments),
    callsRemaining: Math.max(0, DAILY_CALL_GOAL - day.calls),
  };
}
