import { useCallback } from 'react';
import {
  contactUrl,
  demoAccountId,
  demoContactId,
  recordUrl,
  salesforceObjectOf,
} from '@/domain/salesforce';
import type { Lead } from '@/domain/types';
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

const CONTACT_TITLES = {
  Contact: 'Kontakt in Salesforce öffnen',
  Account: 'Kontakte des Accounts in Salesforce öffnen',
  Lead: 'Lead in Salesforce öffnen',
} as const;

/**
 * Link auf den Ansprechpartner eines Leads: der Kontakt selbst, ohne Kontakt-ID die
 * Kontaktliste des Accounts. Demo-Leads bekommen eine Platzhalter-Kontakt-ID.
 */
export function useContactLink(): (
  lead: Pick<Lead, 'id' | 'contactId' | 'contactName'>,
) => SalesforceLinkTarget | null {
  const demo = useAppStore((s) => s.sourceId) === 'mock';
  return useCallback(
    (lead) => {
      if (!salesforceUrl || !lead.contactName) return null;
      const href = contactUrl(salesforceUrl, lead.id, lead.contactId);
      if (href) {
        const object = salesforceObjectOf(lead.contactId) ?? salesforceObjectOf(lead.id);
        return { href, title: object ? CONTACT_TITLES[object] : 'In Salesforce öffnen' };
      }
      if (!demo) return null;
      const demoHref = recordUrl(salesforceUrl, demoContactId(lead.id));
      return demoHref
        ? {
            href: demoHref,
            title: 'Kontakt in Salesforce öffnen (Demo: diesen Kontakt gibt es dort nicht)',
          }
        : null;
    },
    [demo],
  );
}
