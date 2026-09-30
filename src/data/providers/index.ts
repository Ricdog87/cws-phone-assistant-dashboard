import { ClayProvider } from './clayProvider';
import { DnbProvider } from './dnbProvider';
import { MockProvider } from './mockProvider';
import { SalesforceProvider } from './salesforceProvider';
import type { LeadProvider, ProviderId } from './types';

export interface ProviderOption {
  id: ProviderId;
  label: string;
  available: boolean;
  description: string;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'mock',
    label: 'Demo-Daten',
    available: true,
    description: 'Fiktive Betriebe entlang der Beispielroute',
  },
  {
    id: 'csv',
    label: 'CSV-Import',
    available: true,
    description: 'Eigene Datei mit Spaltenzuordnung',
  },
  { id: 'clay', label: 'Clay', available: false, description: 'Gerüst, noch nicht angebunden' },
  {
    id: 'dnb',
    label: 'Dun & Bradstreet',
    available: false,
    description: 'Gerüst, noch nicht angebunden',
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    available: false,
    description: 'Gerüst, noch nicht angebunden',
  },
];

/** Provider ohne weitere Eingaben. CSV wird im Reiter Daten mit Datei und Zuordnung erzeugt. */
export function createProvider(id: Exclude<ProviderId, 'csv'>): LeadProvider {
  switch (id) {
    case 'mock':
      return new MockProvider();
    case 'clay':
      return new ClayProvider();
    case 'dnb':
      return new DnbProvider();
    case 'salesforce':
      return new SalesforceProvider();
  }
}
