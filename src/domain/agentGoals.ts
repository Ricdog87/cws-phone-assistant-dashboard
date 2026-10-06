import type { CallOutcome } from './types';

/**
 * Tages- und Wochenziele der Telefonassistenz.
 * Offener Abstimmungspunkt: Zielwerte und Motivationsformulierungen mit dem Vertrieb abstimmen.
 */

export interface AgentGoals {
  /** Anrufe, die an einem Arbeitstag erledigt werden sollen */
  dailyCalls: number;
  /** Termine, die in der Kalenderwoche (Mo–So) vereinbart werden sollen */
  weeklyAppointments: number;
}

export const DEFAULT_AGENT_GOALS: AgentGoals = {
  dailyCalls: 75,
  weeklyAppointments: 4,
};

export const DEFAULT_AGENT_NAME = 'Tina Muster';

export interface GoalProgress {
  current: number;
  target: number;
  /** Anteil 0–100, über Ziel hinaus gekappt */
  percent: number;
  remaining: number;
  reached: boolean;
}

export interface AgentDayProgress {
  callsToday: GoalProgress;
  appointmentsThisWeek: GoalProgress;
}

/** Lokaler Kalendertag als YYYY-MM-DD */
export function localDayKey(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return localDayKeyFromDate(now);
  return localDayKeyFromDate(date);
}

export function localDayKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Montag 00:00 lokal bis Sonntag 24:00 derselben ISO-Woche */
export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay(); // 0 So … 6 Sa
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfLocalWeek(date: Date): Date {
  const end = startOfLocalWeek(date);
  end.setDate(end.getDate() + 7);
  return end;
}

function goalProgress(current: number, target: number): GoalProgress {
  const safeTarget = Math.max(0, target);
  const safeCurrent = Math.max(0, current);
  const percent =
    safeTarget <= 0 ? 100 : Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
  return {
    current: safeCurrent,
    target: safeTarget,
    percent,
    remaining: Math.max(0, safeTarget - safeCurrent),
    reached: safeTarget > 0 ? safeCurrent >= safeTarget : true,
  };
}

export function computeAgentDayProgress(
  outcomes: readonly CallOutcome[],
  goals: AgentGoals,
  now = new Date(),
): AgentDayProgress {
  const todayKey = localDayKeyFromDate(now);
  const weekStart = startOfLocalWeek(now).getTime();
  const weekEnd = endOfLocalWeek(now).getTime();

  let callsToday = 0;
  let appointmentsThisWeek = 0;

  for (const outcome of outcomes) {
    const recorded = new Date(outcome.recordedAt);
    if (Number.isNaN(recorded.getTime())) continue;
    if (localDayKeyFromDate(recorded) === todayKey) callsToday += 1;
    const t = recorded.getTime();
    if (t >= weekStart && t < weekEnd && outcome.outcome === 'appointment') {
      appointmentsThisWeek += 1;
    }
  }

  return {
    callsToday: goalProgress(callsToday, goals.dailyCalls),
    appointmentsThisWeek: goalProgress(appointmentsThisWeek, goals.weeklyAppointments),
  };
}

/** Kurzer Motivationssatz für die Live-Maske */
export function motivationLine(progress: AgentDayProgress): string {
  const { callsToday, appointmentsThisWeek } = progress;

  if (callsToday.reached && appointmentsThisWeek.reached) {
    return 'Tages- und Wochenziel erreicht. Stark – weiter so.';
  }
  if (callsToday.reached) {
    return `Tagesziel geschafft. Noch ${appointmentsThisWeek.remaining} Termin${
      appointmentsThisWeek.remaining === 1 ? '' : 'e'
    } bis zum Wochenziel.`;
  }
  if (appointmentsThisWeek.reached) {
    return `Wochenziel bei Terminen schon drin. Noch ${callsToday.remaining} Anruf${
      callsToday.remaining === 1 ? '' : 'e'
    } bis zum Tagesziel.`;
  }
  if (callsToday.current === 0) {
    return `Los geht's – ${callsToday.target} Anrufe heute, ${appointmentsThisWeek.target} Termine diese Woche.`;
  }
  if (callsToday.percent < 50) {
    return `Guter Start. Noch ${callsToday.remaining} Anrufe bis zum Tagesziel.`;
  }
  return `Halbzeit geschafft. Noch ${callsToday.remaining} Anrufe – du bist nah dran.`;
}

export function greeting(agentName: string): string {
  const name = agentName.trim() || DEFAULT_AGENT_NAME;
  return `Hallo ${name}`;
}
