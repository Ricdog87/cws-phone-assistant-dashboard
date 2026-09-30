const de1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const de0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const formatOne = (value: number): string => de1.format(value);
export const formatInt = (value: number): string => de0.format(value);
export const formatKm = (value: number): string => `${de1.format(value)} km`;
export const formatMin = (value: number): string => `${de1.format(value)} Min.`;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}
