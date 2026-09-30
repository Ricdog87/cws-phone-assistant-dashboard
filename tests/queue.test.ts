import { describe, expect, it } from 'vitest';
import { buildQueue, nextOpenLeadId } from '@/domain/queue';
import { DEFAULT_WEIGHTS, scoreLeads } from '@/domain/scoring';
import type { Route } from '@/domain/types';
import { makeLead } from './fixtures';

const route: Route = {
  id: 'R',
  name: 'Test',
  points: [
    { lat: 53.0, lng: 8.0 },
    { lat: 53.2, lng: 8.0 },
  ],
};

describe('buildQueue', () => {
  const leads = [
    makeLead({ id: 'near-low', wearerCount: 10 }),
    makeLead({ id: 'near-high', wearerCount: 220, hasDirectDial: true, contactName: 'Frau X' }),
    makeLead({ id: 'far', lng: 8.2 }),
    makeLead({ id: 'customer', isCustomer: true }),
  ];

  it('filtert Korridor und Bestandskunden und sortiert nach Score', () => {
    const scored = scoreLeads(leads, route, DEFAULT_WEIGHTS, 2);
    const queue = buildQueue(scored, false);
    expect(queue.map((e) => e.lead.id)).toEqual(['near-high', 'near-low']);
    expect(queue.map((e) => e.position)).toEqual([1, 2]);
  });

  it('nimmt Leads bei breiterem Korridor auf, Bestandskunden nie', () => {
    const scored = scoreLeads(leads, route, DEFAULT_WEIGHTS, 20);
    const ids = buildQueue(scored, false).map((e) => e.lead.id);
    expect(ids).toContain('far');
    expect(ids).not.toContain('customer');
  });
});

describe('nextOpenLeadId', () => {
  const scored = scoreLeads(
    [makeLead({ id: 'a' }), makeLead({ id: 'b' }), makeLead({ id: 'c' })],
    route,
    DEFAULT_WEIGHTS,
    2,
  );
  const queue = buildQueue(scored, false);

  it('springt zum nächsten offenen Lead', () => {
    expect(nextOpenLeadId(queue, 'a', new Set(['a']))).toBe('b');
    expect(nextOpenLeadId(queue, 'a', new Set(['a', 'b']))).toBe('c');
  });

  it('sucht am Ende vorne weiter', () => {
    expect(nextOpenLeadId(queue, 'c', new Set(['b', 'c']))).toBe('a');
  });

  it('liefert null, wenn alles bearbeitet ist', () => {
    expect(nextOpenLeadId(queue, 'a', new Set(['a', 'b', 'c']))).toBeNull();
  });
});
