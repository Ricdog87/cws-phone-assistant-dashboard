import { describe, expect, it } from 'vitest';
import { demoTeamAppointments } from '@/data/demoAppointments';
import { demoTeamCalls } from '@/data/demoCalls';
import { DEMO_REGIONS } from '@/data/demoTeam';
import { callsToCsv } from '@/domain/export';
import {
  emptyProtocol,
  hasProtocolInfo,
  isNetContact,
  normalizeProtocol,
  solutionText,
} from '@/domain/protocol';
import {
  ALL_CALLS,
  filterCalls,
  latestCallPerCompany,
  summarizeCalls,
  type TeamCall,
} from '@/domain/teamCalls';

const NOW = new Date('2026-10-08T12:00:00');

function teamCall(overrides: Partial<TeamCall> = {}): TeamCall {
  return {
    id: 'c',
    leadId: 'L-1',
    leadName: 'Bau Fehn GmbH',
    city: 'Leer',
    hunterName: 'Jonas Tiedemann',
    assistantName: 'Nele Faber',
    recordedAt: '2026-10-08T09:00:00Z',
    outcome: 'not_interested',
    protocol: {
      ...emptyProtocol(),
      contactRole: 'decisionMaker',
      solution: 'competitor',
      competitor: 'MEWA',
    },
    status: 'synced',
    live: false,
    ...overrides,
  };
}

describe('Gesprächsprotokoll', () => {
  it('nimmt den Wettbewerber nur bei Wettbewerb und kürzt leere Notizen', () => {
    const protocol = normalizeProtocol({
      ...emptyProtocol(),
      solution: 'companyBuys',
      competitor: 'MEWA',
      note: '   ',
    });
    expect(protocol).toMatchObject({ solution: 'companyBuys', competitor: null, note: null });
    expect(hasProtocolInfo(emptyProtocol())).toBe(false);
    expect(hasProtocolInfo({ ...emptyProtocol(), doNotCall: true })).toBe(true);
  });

  it('zählt nur Gespräche mit dem Entscheider als Nettokontakt', () => {
    expect(isNetContact({ ...emptyProtocol(), contactRole: 'decisionMaker' })).toBe(true);
    expect(isNetContact({ ...emptyProtocol(), contactRole: 'gatekeeper' })).toBe(false);
    expect(isNetContact(undefined)).toBe(false);
    expect(solutionText(teamCall().protocol)).toBe('Wettbewerb: MEWA');
  });
});

describe('Gespräche der Führung', () => {
  const calls = [
    teamCall({ id: '1', leadId: 'A', recordedAt: '2026-10-01T09:00:00Z' }),
    teamCall({ id: '2', leadId: 'A', recordedAt: '2026-10-07T09:00:00Z' }),
    teamCall({
      id: '3',
      leadId: 'B',
      protocol: {
        ...emptyProtocol(),
        contactRole: 'gatekeeper',
        solution: 'competitor',
        competitor: 'DBL',
      },
    }),
    teamCall({ id: '4', leadId: 'C', protocol: { ...emptyProtocol(), solution: 'none' } }),
    teamCall({ id: '5', leadId: 'D', protocol: { ...emptyProtocol(), note: 'kurz' } }),
  ];

  it('zeigt je Firma nur das jüngste Gespräch', () => {
    expect(latestCallPerCompany(calls).map((call) => call.id)).toEqual(['3', '4', '5', '2']);
  });

  it('filtert nach aktueller Lösung und Wettbewerber', () => {
    const latest = latestCallPerCompany(calls);
    expect(filterCalls(latest, ALL_CALLS)).toHaveLength(4);
    expect(filterCalls(latest, { solution: 'competitor', competitor: 'all' })).toHaveLength(2);
    expect(
      filterCalls(latest, { solution: 'competitor', competitor: 'DBL' }).map((c) => c.id),
    ).toEqual(['3']);
    expect(filterCalls(latest, { solution: 'open', competitor: 'all' }).map((c) => c.id)).toEqual([
      '5',
    ]);
  });

  it('fasst Firmen, Nettokontakte und Wettbewerber zusammen', () => {
    expect(summarizeCalls(latestCallPerCompany(calls))).toEqual({
      companies: 4,
      netContacts: 1,
      competitor: 2,
      byCompetitor: [
        { name: 'DBL', count: 1 },
        { name: 'MEWA', count: 1 },
      ],
    });
  });

  it('exportiert die Auswahl mit allen Protokollfeldern', () => {
    const csv = callsToCsv([teamCall()]);
    const [header, row] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'Datum;Firma;Ort;Hunter;Telefonassistenz;Ergebnis;Gesprächspartner;Nettokontakt;Aktuelle Lösung;Wettbewerber;Firma erloschen;Zentralentscheidung;Bestandskunde;Nicht mehr anrufen;Notiz',
    );
    expect(row).toContain(';Kein Interesse;Entscheider;ja;Wettbewerb (Mietservice);MEWA;');
  });
});

describe('demoTeamCalls', () => {
  it('liefert je Firma ein Gespräch, passend zu den Terminen der Woche', () => {
    for (const region of DEMO_REGIONS) {
      const calls = demoTeamCalls(region.id, region.members, {}, NOW);
      const names = calls.map((call) => call.leadName);
      expect(new Set(names).size).toBe(names.length);
      const appointments = demoTeamAppointments(region.id, region.members, {}, NOW);
      const booked = calls.filter((call) => call.outcome === 'appointment');
      expect(booked.map((call) => call.leadName).sort()).toEqual(
        appointments.map((row) => row.leadName).sort(),
      );
      expect(booked.every((call) => isNetContact(call.protocol))).toBe(true);
      expect(calls.every((call) => call.recordedAt <= NOW.toISOString())).toBe(true);
      const summary = summarizeCalls(calls);
      expect(summary.competitor).toBeGreaterThan(calls.length / 4);
      expect(summary.byCompetitor.map((item) => item.name)).toEqual(
        expect.arrayContaining(['MEWA', 'DBL', 'Bardusch', 'Alsco']),
      );
    }
  });
});
