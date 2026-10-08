/** Tage zwischen der letzten Aktivität und heute, beides als YYYY-MM-DD; null ohne Aktivität */
export function daysSinceActivity(
  lastActivity: string | null | undefined,
  today: string,
): number | null {
  if (!lastActivity) return null;
  const from = Date.parse(`${lastActivity.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** Kurzform für Liste und Briefing, etwa „vor 3 Wochen“ */
export function activityLabel(days: number | null): string {
  if (days === null) return 'keine Aktivität';
  if (days === 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 14) return `vor ${days} Tagen`;
  if (days < 60) return `vor ${Math.round(days / 7)} Wochen`;
  if (days < 730) return `vor ${Math.round(days / 30)} Monaten`;
  return `vor ${Math.round(days / 365)} Jahren`;
}

/** Datum aus Salesforce-Exporten (TT.MM.JJJJ oder JJJJ-MM-TT) als YYYY-MM-DD, sonst null */
export function parseActivityDate(raw: string | undefined): string | null {
  const value = raw?.trim() ?? '';
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (german) {
    const [, d = '', m = '', y = ''] = german;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}
