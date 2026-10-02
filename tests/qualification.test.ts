import { describe, expect, it } from 'vitest';
import { painPointWithinLimit, qualificationVerdict } from '@/domain/qualification';
import type { CurrentSolution } from '@/domain/types';

const appointment = new Date(2026, 9, 2);

function answers(overrides: {
  contactRole?: 'decisionMaker' | 'gatekeeper' | null;
  currentSolution?: CurrentSolution | null;
  contractEnd?: string | null;
  wearers?: number | null;
  decisionMakerAtMeeting?: boolean | null;
}) {
  return {
    contactRole: 'decisionMaker' as const,
    currentSolution: 'purchaseCompanyWash' as CurrentSolution,
    contractEnd: null,
    wearers: 40,
    decisionMakerAtMeeting: true,
    ...overrides,
  };
}

describe('qualificationVerdict', () => {
  it('bleibt offen, solange ein Pflichtfeld fehlt', () => {
    expect(qualificationVerdict(answers({ decisionMakerAtMeeting: null }), appointment)).toEqual({
      status: 'open',
      reason: 'incomplete',
    });
  });

  it('qualifiziert, wenn der Entscheider dabei ist und kein langer Mietvertrag läuft', () => {
    expect(qualificationVerdict(answers({}), appointment)).toEqual({
      status: 'qualified',
      reason: 'qualified',
    });
  });

  it('ist teilqualifiziert, wenn der Entscheider nicht dabei ist', () => {
    expect(qualificationVerdict(answers({ decisionMakerAtMeeting: false }), appointment)).toEqual({
      status: 'partial',
      reason: 'noDecisionMaker',
    });
  });

  it('ist teilqualifiziert, wenn das Vertragsende fehlt', () => {
    expect(
      qualificationVerdict(answers({ currentSolution: 'rental', contractEnd: null }), appointment),
    ).toEqual({ status: 'partial', reason: 'contractEndUnknown' });
  });

  it('ist nicht qualifiziert unter 15 Trägern', () => {
    expect(qualificationVerdict(answers({ wearers: 14 }), appointment)).toEqual({
      status: 'unqualified',
      reason: 'tooFewWearers',
    });
  });

  it('ist nicht qualifiziert, wenn der Mietvertrag mehr als 18 Monate nach dem Termin endet', () => {
    expect(
      qualificationVerdict(
        answers({ currentSolution: 'rental', contractEnd: '2028-05' }),
        appointment,
      ),
    ).toEqual({ status: 'unqualified', reason: 'contractTooLong' });
  });

  it('begrenzt den Freitext auf 200 Zeichen', () => {
    expect(painPointWithinLimit('a'.repeat(200))).toBe(true);
    expect(painPointWithinLimit('a'.repeat(201))).toBe(false);
  });
});
