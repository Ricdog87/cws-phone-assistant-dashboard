import type { ReactNode } from 'react';

/** Abschnittsüberschrift mit optionalem Zusatz rechts */
export function SectionTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {aside}
    </div>
  );
}
