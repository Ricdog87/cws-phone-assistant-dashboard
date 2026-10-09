import { useCallback } from 'react';
import { demoAccountId, recordUrl, salesforceObjectOf } from '@/domain/salesforce';
import { salesforceUrl } from './services';
import { useAppStore } from './store';

export interface SalesforceLinkTarget {
  href: string;
  title: string;
}

/**
 * Link auf den Datensatz in Salesforce, meist den Account. Echte Leads tragen ihre
 * Salesforce-ID; Demo-Leads bekommen eine Platzhalter-ID, die es in Salesforce nicht gibt.
 */
export function useSalesforceLink(): (
  recordId: string | null | undefined,
) => SalesforceLinkTarget | null {
  const demo = useAppStore((s) => s.sourceId) === 'mock';
  return useCallback(
    (recordId) => {
      if (!salesforceUrl || !recordId) return null;
      if (salesforceObjectOf(recordId)) {
        const href = recordUrl(salesforceUrl, recordId);
        return href ? { href, title: 'In Salesforce öffnen' } : null;
      }
      if (!demo) return null;
      const href = recordUrl(salesforceUrl, demoAccountId(recordId));
      return href
        ? { href, title: 'In Salesforce öffnen (Demo: diesen Account gibt es dort nicht)' }
        : null;
    },
    [demo],
  );
}
