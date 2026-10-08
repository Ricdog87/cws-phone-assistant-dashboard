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
    });
    expect(hooks.map((h) => h.kind)).toEqual([
      'open_positions',
      'site_expansion',
      'management_change',
      'certification',
    ]);
    expect(hooks[0]?.text).toBe('4 offene Stellen im gewerblichen Bereich');
  });

  it('nennt eine einzelne offene Stelle in der Einzahl', () => {
    const [hook] = buildHooks({ lead: makeLead({ openPositions: 1 }) });
    expect(hook?.text).toBe('1 offene Stelle im gewerblichen Bereich');
    expect(hook?.opener).toContain('dass Sie gerade eine gewerbliche Stelle besetzen');
  });

  it('greift ohne Signale auf die Trägerzahl zurück', () => {
    const hooks = buildHooks({ lead: makeLead({ wearerCount: 80 }) });
    expect(hooks.map((h) => h.kind)).toEqual(['wearers']);
  });
});

describe('buildBriefing', () => {
  it('spricht den bekannten Ansprechpartner an', () => {
    const briefing = buildBriefing({
      lead: makeLead({ contactName: 'Frau Janssen', contactRole: 'Einkauf', openPositions: 2 }),
    });
    expect(briefing.contact).toBe('Frau Janssen, Einkauf');
    expect(briefing.openingLine.startsWith('Guten Tag Frau Janssen, hier ist [Name] von CWS')).toBe(
      true,
    );
  });

  it('nennt die anrufende Person, wenn der Name übergeben wird', () => {
    const briefing = buildBriefing(
      {
        lead: makeLead({ contactName: 'Frau Janssen', openPositions: 2 }),
      },
      'Martina Weidmann',
    );
    expect(briefing.openingLine).toContain('hier ist Martina Weidmann von CWS Workwear');
  });

  it('weist ohne Ansprechpartner auf die Zentrale hin', () => {
    expect(contactLabel({ lead: makeLead() })).toMatch(/Zentrale/);
  });
});
