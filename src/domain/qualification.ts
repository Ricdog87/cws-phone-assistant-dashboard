import { CONTRACT_WINDOW_MONTHS, MIN_WEARERS, PAIN_POINT_MAX_LENGTH } from './qualificationConfig';
import type { QualificationAnswers, QualificationStatus } from './types';

export type QualificationReason =
  | 'incomplete'
  | 'tooFewWearers'
  | 'contractTooLong'
  | 'qualified'
  | 'noDecisionMaker'
  | 'contractEndUnknown'
  | 'partial';

export interface QualificationVerdict {
  status: QualificationStatus;
  reason: QualificationReason;
}

type Answers = Pick<
  QualificationAnswers,
  'contactRole' | 'currentSolution' | 'contractEnd' | 'wearers' | 'decisionMakerAtMeeting'
>;

/** Monatsabstand von YYYY-MM zum Termindatum. Ungültige Angaben bleiben unbekannt. */
function monthsAfterAppointment(contractEnd: string, appointmentDate: Date): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(contractEnd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return (year - appointmentDate.getFullYear()) * 12 + (month - (appointmentDate.getMonth() + 1));
}

/**
 * Status blockiert keine Buchung. Termindatum ist der Bezug für das Vertragsfenster.
 */
export function qualificationVerdict(
  answers: Answers,
  appointmentDate: Date,
): QualificationVerdict {
  if (
    answers.contactRole === null ||
    answers.currentSolution === null ||
    answers.wearers === null ||
    answers.decisionMakerAtMeeting === null
  ) {
    return { status: 'open', reason: 'incomplete' };
  }

  if (answers.wearers < MIN_WEARERS) {
    return { status: 'unqualified', reason: 'tooFewWearers' };
  }

  const months =
    answers.contractEnd === null
      ? null
      : monthsAfterAppointment(answers.contractEnd, appointmentDate);
  const contractTooLong =
    answers.currentSolution === 'rental' && months !== null && months > CONTRACT_WINDOW_MONTHS;
  if (contractTooLong) {
    return { status: 'unqualified', reason: 'contractTooLong' };
  }

  const contractInWindow =
    answers.currentSolution !== 'rental' || (months !== null && months <= CONTRACT_WINDOW_MONTHS);
  if (answers.decisionMakerAtMeeting && contractInWindow) {
    return { status: 'qualified', reason: 'qualified' };
  }

  if (!answers.decisionMakerAtMeeting) {
    return { status: 'partial', reason: 'noDecisionMaker' };
  }
  if (answers.currentSolution === 'rental' && answers.contractEnd === null) {
    return { status: 'partial', reason: 'contractEndUnknown' };
  }
  return { status: 'partial', reason: 'partial' };
}

export function painPointWithinLimit(painPoint: string | null): boolean {
  return painPoint === null || painPoint.length <= PAIN_POINT_MAX_LENGTH;
}
