import type { Lead } from '@/domain/types';
import { MOCK_LEADS } from '../mockLeads';
import type { LeadProvider } from './types';

export class MockProvider implements LeadProvider {
  readonly id = 'mock' as const;
  readonly label = 'Demo-Daten';

  async load(): Promise<Lead[]> {
    return MOCK_LEADS.map((lead) => ({ ...lead }));
  }
}
