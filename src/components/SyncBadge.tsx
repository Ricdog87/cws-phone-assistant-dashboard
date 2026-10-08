import { SYNC_STATUS_LABELS, type SyncStatus } from '@/domain/salesforceSync';

const STYLE: Record<SyncStatus, string> = {
  synced: 'border-border text-muted',
  demo: 'border-border text-muted',
  pending: 'border-border text-muted',
  failed: 'border-brand-primary text-brand-primary',
  notConnected: 'border-brand-primary text-brand-primary',
};

const HINT: Partial<Record<SyncStatus, string>> = {
  demo: 'Demo-Daten: Die Übertragung an Salesforce wird nur simuliert.',
  notConnected: 'Die Salesforce-Anbindung ist noch nicht freigeschaltet. Der Eintrag wartet.',
  failed: 'Übertragung fehlgeschlagen. Beim nächsten Start versucht das Cockpit es erneut.',
};

/** Status der Übertragung nach Salesforce, als Text und nicht nur als Farbe */
export function SyncBadge({ status }: { status: SyncStatus }) {
  return (
    <span
      title={HINT[status]}
      className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-bold ${STYLE[status]}`}
    >
      {SYNC_STATUS_LABELS[status]}
    </span>
  );
}
