const de1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const de0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const formatOne = (value: number): string => de1.format(value);
export const formatInt = (value: number): string => de0.format(value);
export const formatKm = (value: number): string => `${de1.format(value)} km`;
export const formatMin = (value: number): string => `${de1.format(value)} Min.`;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/** YYYY-MM-DD als „Do, 08.10.2026“ */
export function formatDay(isoDate: string): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
