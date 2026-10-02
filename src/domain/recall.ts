import { BOOKING_LEAD_DAYS_MIN } from './routingConfig';
import { CONTRACT_RECALL_MONTHS_BEFORE } from './qualificationConfig';

/** Erster des Monats, neun Monate vor Vertragsende, sonst der nächste Werktag. */
export function suggestRecallDate(contractEnd: string, today: Date): string | 'bookNow' {
  const match = /^(\d{4})-(\d{2})$/.exec(contractEnd);
  if (!match) return 'bookNow';
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return 'bookNow';

  const recall = nextWeekday(new Date(year, month - 1 - CONTRACT_RECALL_MONTHS_BEFORE, 1));
  const earliest = addBusinessDays(startOfDay(today), BOOKING_LEAD_DAYS_MIN);
  if (recall < earliest) return 'bookNow';
  return formatIsoDate(recall);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextWeekday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let left = days;
  while (left > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return result;
}

function formatIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
