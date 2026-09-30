import type { CallOutcome, Lead } from '@/domain/types';

export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'L-1',
    name: 'Testbetrieb GmbH',
    industry: 'Metallbau',
    street: '',
    postalCode: '',
    city: 'Oldenburg',
    lat: 53.1,
    lng: 8.0,
    commercialEmployees: 50,
    wearerCount: 50,
    phone: '',
    hasDirectDial: false,
    contactName: null,
    contactRole: null,
    openPositions: 0,
    certification: null,
    siteExpansion: false,
    managementChange: false,
    isCustomer: false,
    ...overrides,
  };
}

export function makeOutcome(overrides: Partial<CallOutcome> = {}): CallOutcome {
  return {
    id: 'O-1',
    leadId: 'L-1',
    leadName: 'Testbetrieb GmbH',
    outcome: 'appointment',
    recordedAt: '2026-09-01T09:00:00.000Z',
    band: 'A',
    score: 81,
    dimensions: { fit: 95, proximity: 100, potential: 50, reachability: 67 },
    normalizedWeights: { fit: 30, proximity: 30, potential: 25, reachability: 15 },
    distanceKm: 0.5,
    detourMinutes: 3.3,
    isControl: false,
    queuePosition: 1,
    sourceId: 'mock',
    ...overrides,
  };
}
