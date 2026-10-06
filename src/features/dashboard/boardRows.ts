import type { MemberStanding } from '@/domain/standings';

export interface RankedMember {
  member: MemberStanding;
  /** Platz in der Rangfolge aus standings.ts, unabhängig vom Filter */
  rank: number;
}

/** Rang je Person aus der bereits sortierten Liste der Standings */
export function withRanks(members: readonly MemberStanding[]): RankedMember[] {
  return members.map((member, index) => ({ member, rank: index + 1 }));
}

/**
 * Personen mit der größten Lücke zum Wochenziel, für die Ansprache durch die Führung.
 * Reine Anzeige-Sortierung: zuerst offene Termine, dann offene Anrufe heute, dann Name.
 */
export function largestGaps(members: readonly MemberStanding[], limit: number): MemberStanding[] {
  return members
    .filter((member) => member.appointmentsRemaining > 0)
    .sort((a, b) => {
      if (b.appointmentsRemaining !== a.appointmentsRemaining) {
        return b.appointmentsRemaining - a.appointmentsRemaining;
      }
      if (b.dayCallsRemaining !== a.dayCallsRemaining) {
        return b.dayCallsRemaining - a.dayCallsRemaining;
      }
      return a.fullName.localeCompare(b.fullName, 'de');
    })
    .slice(0, limit);
}
