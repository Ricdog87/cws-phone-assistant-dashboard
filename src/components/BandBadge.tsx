import type { Band } from '@/domain/types';

const BAND_CLASSES: Record<Band, string> = {
  A: 'bg-band-a text-on-primary',
  B: 'bg-band-b text-brand-ink',
  C: 'bg-band-c text-on-primary',
};

export function BandBadge({ band }: { band: Band }) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${BAND_CLASSES[band]}`}
      aria-label={`Band ${band}`}
    >
      {band}
    </span>
  );
}
