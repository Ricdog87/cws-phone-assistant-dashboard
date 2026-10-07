import type { Lead } from '@/domain/types';
import { MOCK_LEADS } from '../mockLeads';
import { MOCK_LEADS_NORDWEST } from '../mockLeadsNordwest';
import type { LeadProvider } from './types';

export class MockProvider implements LeadProvider {
  readonly id = 'mock' as const;
  readonly label = 'Demo-Daten';

  async load(): Promise<Lead[]> {
    return [...MOCK_LEADS, ...MOCK_LEADS_NORDWEST].map((lead) => ({ ...lead }));
  }
}
