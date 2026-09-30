import { describe, expect, it } from 'vitest';
import { buildBriefing, buildHooks, contactLabel } from '@/domain/briefing';
import { makeLead } from './fixtures';

describe('buildHooks', () => {
  it('leitet Aufhänger aus den Merkmalen ab', () => {
    const hooks = buildHooks({
      lead: makeLead({
        openPositions: 4,
        siteExpansion: true,
        managementChange: true,
        certification: 'IFS Food',
      }),
      detourMinutes: 3.1,
    });
    expect(hooks.map((h) => h.kind)).toEqual([
      'open_positions',
      'site_expansion',
      'management_change',
      'certification',
      'on_route',
    ]);
    expect(hooks[0]?.text).toBe('4 offene Stellen im gewerblichen Bereich');
  });

  it('greift ohne Signale auf die Trägerzahl zurück', () => {
    const hooks = buildHooks({ lead: makeLead({ wearerCount: 80 }), detourMinutes: 9 });
    expect(hooks.map((h) => h.kind)).toEqual(['wearers']);
  });
});

describe('buildBriefing', () => {
  it('spricht den bekannten Ansprechpartner an', () => {
    const briefing = buildBriefing({
      lead: makeLead({ contactName: 'Frau Janssen', contactRole: 'Einkauf', openPositions: 2 }),
      detourMinutes: 9,
    });
    expect(briefing.contact).toBe('Frau Janssen, Einkauf');
    expect(briefing.openingLine.startsWith('Guten Tag Frau Janssen, hier ist [Name] von CWS')).toBe(
      true,
    );
  });

  it('weist ohne Ansprechpartner auf die Zentrale hin', () => {
    expect(contactLabel({ lead: makeLead() })).toMatch(/Zentrale/);
  });
});
