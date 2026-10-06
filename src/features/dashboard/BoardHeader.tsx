import { useCallDay } from '@/app/selectors';
import { noun } from './memberFormat';

interface BoardHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

/** Kopf der Führungsansichten mit Datum und Restlaufzeit der Woche */
export function BoardHeader({ eyebrow, title, subtitle }: BoardHeaderProps) {
  const today = useCallDay();
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="text-sm sm:text-right">
        <p className="font-bold">
          {today.weekday}, {today.dateLabel}
        </p>
        <p className="text-muted">
          Wochenziel bis {today.weekEndLabel} · noch {today.daysRemaining}{' '}
          {noun(today.daysRemaining, 'Tag', 'Tage')}
        </p>
      </div>
    </header>
  );
}
