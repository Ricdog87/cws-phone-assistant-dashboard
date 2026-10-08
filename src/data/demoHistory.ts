import type { MemberActivity } from '@/domain/standings';

export interface WeekPoint {
  /** Kalenderwoche nach ISO 8601 */
  week: number;
  calls: number;
  appointments: number;
  current: boolean;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kalenderwoche nach ISO 8601 */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Fiktive Werte einer Vorwoche um das übliche Niveau der Person, back Wochen zurück */
export function demoPastWeek(
  member: MemberActivity,
  today: Date,
  back: number,
): Omit<WeekPoint, 'current'> {
  const baseCalls = member.live ? 180 : Math.max(80, member.weekCalls);
  const baseAppointments = member.live ? 3 : member.weekAppointments;
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back * 7);
  const seed = hash(`${member.id}-${back}`);
  return {
    week: isoWeek(date),
    calls: Math.round(baseCalls * (0.85 + (seed % 31) / 100)),
    appointments: Math.max(0, baseAppointments + ((seed >>> 5) % 3) - 1),
  };
}

/**
 * Werdegang der letzten Wochen: Vorwochen sind fiktive Demo-Werte um das übliche
 * Niveau der Person, die laufende Woche sind die echten Werte.
 */
export function demoHistory(
  member: MemberActivity,
  today: Date = new Date(),
  weeks = 6,
): WeekPoint[] {
  const points: WeekPoint[] = [];
  for (let back = weeks - 1; back >= 1; back--) {
    points.push({ ...demoPastWeek(member, today, back), current: false });
  }
  points.push({
    week: isoWeek(today),
    calls: member.weekCalls,
    appointments: member.weekAppointments,
    current: true,
  });
  return points;
}
