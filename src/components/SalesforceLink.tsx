import type { ReactNode } from 'react';

interface SalesforceLinkProps {
  /** Ziel in Salesforce; ohne Ziel bleibt der Text ohne Link */
  target: { href: string; title: string } | null;
  children: ReactNode;
  className?: string;
  /** Nur das Symbol, etwa in einer Zeile, deren Klick schon etwas anderes tut */
  iconOnly?: boolean;
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h4v4M13 3L7 9M12 9.5V13H3V4h3.5" />
    </svg>
  );
}

/** Firmenname als Link auf den Account in Salesforce, öffnet in einem neuen Tab */
export function SalesforceLink({
  target,
  children,
  className = '',
  iconOnly = false,
}: SalesforceLinkProps) {
  if (!target) return iconOnly ? null : <span className={className}>{children}</span>;
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      title={target.title}
      aria-label={
        iconOnly
          ? `${typeof children === 'string' ? children : 'Account'} in Salesforce öffnen`
          : undefined
      }
      onClick={(event) => event.stopPropagation()}
      className={`group inline-flex min-w-0 items-center gap-1 hover:underline ${className}`}
    >
      {!iconOnly && children}
      <ExternalIcon />
    </a>
  );
}
