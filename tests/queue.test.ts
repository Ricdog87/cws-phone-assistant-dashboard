import { describe, expect, it } from 'vitest';
import { buildQueue, nextOpenLeadId, ownerCounts } from '@/domain/queue';
import { DEFAULT_WEIGHTS, scoreLeads } from '@/domain/scoring';
import { makeLead } from './fixtures';

describe('buildQueue', () => {
  const leads = [
    makeLead({ id: 'low', wearerCount: 10, owner: 'Hunter A' }),
    makeLead({
      id: 'high',
      wearerCount: 220,
      hasDirectDial: true,
      contactName: 'Frau X',
      owner: 'Hunter A',
    }),
    makeLead({ id: 'other', wearerCount: 150, owner: 'Hunter B' }),
    makeLead({ id: 'customer', isCustomer: true, owner: 'Hunter A' }),
  ];

  it('nimmt alle Neukunden ohne Bestandskunden und sortiert nach Score', () => {
    const queue = buildQueue(scoreLeads(leads, DEFAULT_WEIGHTS), false);
    expect(queue.map((e) => e.lead.id)).toEqual(['high', 'other', 'low']);
    expect(queue.map((e) => e.position)).toEqual([1, 2, 3]);
  });

  it('zeigt nur die Potenzialliste des gewählten Hunters', () => {
    const queue = buildQueue(scoreLeads(leads, DEFAULT_WEIGHTS), false, 'Hunter A');
    expect(queue.map((e) => e.lead.id)).toEqual(['high', 'low']);
  });
});

describe('ownerCounts', () => {
  it('zählt Neukunden je Hunter, ohne Bestandskunden und ohne Inhaber', () => {
    expect(
      ownerCounts([
        makeLead({ owner: 'Berta' }),
        makeLead({ owner: 'Anton' }),
        makeLead({ owner: 'Berta' }),
        makeLead({ owner: 'Berta', isCustomer: true }),
        makeLead({ owner: null }),
      ]),
    ).toEqual([
      { owner: 'Anton', count: 1 },
      { owner: 'Berta', count: 2 },
    ]);
  });
});

describe('nextOpenLeadId', () => {
  const scored = scoreLeads(
    [makeLead({ id: 'a' }), makeLead({ id: 'b' }), makeLead({ id: 'c' })],
    DEFAULT_WEIGHTS,
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
