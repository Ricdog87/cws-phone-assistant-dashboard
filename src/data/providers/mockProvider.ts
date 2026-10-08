import type { Lead } from '@/domain/types';
import { withDemoOwnership } from '../demoOwnership';
import { MOCK_LEADS } from '../mockLeads';
import { MOCK_LEADS_NORDWEST } from '../mockLeadsNordwest';
import type { LeadProvider } from './types';

export class MockProvider implements LeadProvider {
  readonly id = 'mock' as const;
  readonly label = 'Demo-Daten';

  constructor(private readonly today: () => string = () => new Date().toISOString().slice(0, 10)) {}

  async load(): Promise<Lead[]> {
    return withDemoOwnership([...MOCK_LEADS, ...MOCK_LEADS_NORDWEST], this.today());
  }
}
