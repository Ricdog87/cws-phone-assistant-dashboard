import { useCallback, useState } from 'react';
import type { MemberStanding } from '@/domain/standings';

/** Welche Personen die Kennzahl-Kacheln gerade zeigen. */
export type BoardFocus = 'all' | 'weekGap' | 'dayGap' | 'weekHit';

export function matchesFocus(member: MemberStanding, focus: BoardFocus): boolean {
  if (focus === 'weekGap') return member.weekAppointments < member.weeklyAppointmentGoal;
  if (focus === 'dayGap') return member.dayCalls < member.dailyCallGoal;
  if (focus === 'weekHit') return member.weekAppointments >= member.weeklyAppointmentGoal;
  return true;
}

/** Ein Tipp filtert, der zweite Tipp zeigt wieder alle. */
export function useBoardFocus() {
  const [focus, setFocus] = useState<BoardFocus>('all');
  const select = useCallback((next: Exclude<BoardFocus, 'all'>) => {
    setFocus((current) => (current === next ? 'all' : next));
  }, []);
  return { focus, select };
}
