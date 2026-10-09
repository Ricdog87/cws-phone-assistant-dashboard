import { describe, expect, it } from 'vitest';
import { demoTeamAppointments } from '@/data/demoAppointments';
import { demoTeamCalls } from '@/data/demoCalls';
import { DEMO_REGIONS } from '@/data/demoTeam';
import { marketToCsv } from '@/domain/export';
import {
  ALL_MARKET,
  competitorChoice,
  contractEndsByQuarter,
  filterMarket,
  followUpBucket,
  industryMatrix,
  solutionBreakdown,
  sortForFollowUp,
  summarizeMarket,
  toMarketRow,
} from '@/domain/market';
import { openCallFor } from '@/domain/openCalls';
import {
  carryOverProtocol,
  emptyProtocol,
  hasProtocolInfo,
  isNetContact,
  normalizeProtocol,
  protocolSummary,
  sameProtocol,
  solutionText,
} from '@/domain/protocol';
import { contractFollowUpDate } from '@/domain/recall';
import { callOutcomeText, latestCallPerCompany, type TeamCall } from '@/domain/teamCalls';

const NOW = new Date('2026-10-08T12:00:00');

function teamCall(overrides: Partial<TeamCall> = {}): TeamCall {
  return {
    id: 'c',
    leadId: 'L-1',
    leadName: 'Bau Fehn GmbH',
    city: 'Leer',
    industry: 'Bau',
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

  it('erkennt ungespeicherte Änderungen erst nach dem Bereinigen', () => {
    const saved = normalizeProtocol({ ...emptyProtocol(), note: 'Vertrag bis 2027' });
    expect(sameProtocol({ ...saved, note: ' Vertrag bis 2027 ' }, saved)).toBe(true);
    expect(sameProtocol({ ...saved, doNotCall: true }, saved)).toBe(false);
    expect(sameProtocol({ ...emptyProtocol(), note: '' }, emptyProtocol())).toBe(true);
  });

  it('führt das Vertragsende nur bei Wettbewerb und übernimmt den bekannten Stand', () => {
    const known = normalizeProtocol({
      ...emptyProtocol(),
      contactRole: 'gatekeeper',
      solution: 'competitor',
      competitor: 'MEWA',
      contractEnd: '2027-03',
      centralDecision: true,
      note: 'alt',
    });
    expect(protocolSummary(known)).toBe(
      'Wettbewerb: MEWA · Vertrag bis 03/2027 · Zentralentscheidung',
    );
    expect(normalizeProtocol({ ...known, solution: 'companyBuys' }).contractEnd).toBeNull();
    expect(normalizeProtocol({ ...known, contractEnd: '03/2027' }).contractEnd).toBeNull();
    // Ältere Protokolle ohne Vertragsende
    const legacy = { ...known } as Partial<typeof known>;
    delete legacy.contractEnd;
    expect(normalizeProtocol(legacy as typeof known).contractEnd).toBeNull();
    // Übernehmen: Lösung, Vertragsende und Hinweise, nicht Gesprächspartner und Notiz
    const current = { ...emptyProtocol(), contactRole: 'decisionMaker' as const, note: 'neu' };
    expect(carryOverProtocol(current, known)).toEqual({
      ...known,
      contactRole: 'decisionMaker',
      note: 'neu',
    });
  });

  it('findet das offene Gespräch zum Lead', () => {
    const call = (id: string, leadId: string, savedAt: string) => ({
      id,
      leadId,
      leadName: 'Bau Fehn GmbH',
      owner: null,
      protocol: emptyProtocol(),
      savedAt,
    });
    const calls = [
      call('a', 'L-1', '2026-10-08T09:00:00Z'),
      call('b', 'L-1', '2026-10-08T10:00:00Z'),
      call('c', 'L-2', '2026-10-08T11:00:00Z'),
    ];
    expect(openCallFor(calls, 'L-1')?.id).toBe('b');
    expect(openCallFor(calls, 'L-3')).toBeUndefined();
  });
});

describe('Wettbewerbsauswertung', () => {
  const TODAY = '2026-10-09';
  const competitor = (name: string, contractEnd: string | null) => ({
    ...emptyProtocol(),
    contactRole: 'decisionMaker' as const,
    solution: 'competitor' as const,
    competitor: name,
    contractEnd,
  });
  const rows = [
    // Vertrag endet 03/2027: Nachfassen ab 01.06.2026, also jetzt
    teamCall({ id: '1', leadId: 'A', protocol: competitor('MEWA', '2027-03') }),
    // Ende 09/2027: Nachfassen ab 01.12.2026, in den nächsten drei Monaten
    teamCall({
      id: '2',
      leadId: 'B',
      industry: 'Logistik',
      protocol: competitor('DBL', '2027-09'),
    }),
    teamCall({ id: '3', leadId: 'C', protocol: competitor('MEWA', null) }),
    // Termin vereinbart: erledigt, obwohl das Vertragsende nah ist
    teamCall({
      id: '4',
      leadId: 'D',
      outcome: 'appointment',
      protocol: competitor('Alsco', '2027-01'),
    }),
    teamCall({ id: '5', leadId: 'E', protocol: { ...emptyProtocol(), solution: 'companyBuys' } }),
    teamCall({
      id: '6',
      leadId: 'F',
      industry: '',
      protocol: { ...emptyProtocol(), note: 'kurz' },
    }),
  ].map((call) => toMarketRow(call, 'nord', TODAY));

  it('leitet den Nachfass-Termin aus dem Vertragsende ab', () => {
    expect(contractFollowUpDate('2027-03')).toBe('2026-06-01');
    // Erster Werktag: der 1. August 2027 ist ein Sonntag
    expect(contractFollowUpDate('2028-05')).toBe('2027-08-02');
    expect(contractFollowUpDate('2027-13')).toBeNull();
    expect(followUpBucket('2026-10-09', TODAY)).toBe('now');
    expect(followUpBucket('2026-12-01', TODAY)).toBe('next3');
    expect(followUpBucket('2027-06-01', TODAY)).toBe('next12');
    expect(followUpBucket('2028-01-03', TODAY)).toBe('later');
    expect(followUpBucket(null, TODAY)).toBe('unknown');
    expect(rows.map((row) => row.bucket)).toEqual([
      'now',
      'next3',
      'unknown',
      'settled',
      null,
      null,
    ]);
  });

  it('nennt Gespräche ohne gebuchtes Ergebnis offen', () => {
    expect(callOutcomeText(null)).toBe('Ergebnis offen');
    expect(callOutcomeText('callback')).toBe('Wiedervorlage');
  });

  it('zeigt je Firma nur das jüngste Gespräch', () => {
    const calls = [
      teamCall({ id: '1', leadId: 'A', recordedAt: '2026-10-01T09:00:00Z' }),
      teamCall({ id: '2', leadId: 'A', recordedAt: '2026-10-07T09:00:00Z' }),
      teamCall({ id: '3', leadId: 'B', recordedAt: '2026-10-08T09:00:00Z' }),
    ];
    expect(latestCallPerCompany(calls).map((call) => call.id)).toEqual(['3', '2']);
  });

  it('filtert nach Branche, Lösung, Wettbewerber und Nachfassen', () => {
    expect(filterMarket(rows, ALL_MARKET)).toHaveLength(6);
    expect(filterMarket(rows, { ...ALL_MARKET, industry: 'Logistik' }).map((r) => r.id)).toEqual([
      '2',
    ]);
    expect(
      filterMarket(rows, { ...ALL_MARKET, industry: 'Branche unbekannt' }).map((r) => r.id),
    ).toEqual(['6']);
    expect(filterMarket(rows, { ...ALL_MARKET, solution: 'competitor' })).toHaveLength(4);
    expect(
      filterMarket(rows, { ...ALL_MARKET, solution: competitorChoice('MEWA') }).map((r) => r.id),
    ).toEqual(['1', '3']);
    expect(filterMarket(rows, { ...ALL_MARKET, solution: 'open' }).map((r) => r.id)).toEqual(['6']);
    expect(filterMarket(rows, { ...ALL_MARKET, followUp: 'now' }).map((r) => r.id)).toEqual(['1']);
    // Eigene Dimension ausgelassen: alle Lösungen trotz Filter
    expect(filterMarket(rows, { ...ALL_MARKET, solution: 'open' }, ['solution'])).toHaveLength(6);
  });

  it('fasst Firmen, Wettbewerb, fällige und fehlende Vertragsenden zusammen', () => {
    expect(summarizeMarket(rows)).toEqual({
      companies: 6,
      netContacts: 4,
      competitor: 4,
      followUpNow: 1,
      contractUnknown: 1,
    });
  });

  it('zählt Firmen je Wettbewerber in fester Reihenfolge', () => {
    const slices = solutionBreakdown(rows);
    expect(slices.slice(0, 6).map((slice) => [slice.label, slice.count])).toEqual([
      ['MEWA', 2],
      ['Bardusch', 0],
      ['DBL', 1],
      ['Alsco', 1],
      ['Sonstiger', 0],
      ['Unbekannt', 0],
    ]);
    expect(slices.find((slice) => slice.choice === 'companyBuys')?.count).toBe(1);
    expect(slices.at(-1)).toMatchObject({ choice: 'open', count: 1 });
  });

  it('verteilt offene Vertragsenden auf Quartale, ohne erledigte', () => {
    const bars = contractEndsByQuarter(rows, TODAY, 4);
    expect(bars.map((bar) => bar.label)).toEqual(['Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027']);
    expect(bars.map((bar) => [bar.now, bar.later])).toEqual([
      [0, 0],
      [1, 0],
      [0, 0],
      [0, 1],
    ]);
  });

  it('stellt Branchen mit Firmen je Wettbewerber auf', () => {
    const matrix = industryMatrix(rows);
    expect(matrix[0]).toMatchObject({ industry: 'Bau', companies: 4, competitor: 3 });
    expect(matrix[0]?.byCompetitor).toMatchObject({ MEWA: 2, Alsco: 1, DBL: 0 });
    expect(matrix.map((row) => row.industry)).toEqual(['Bau', 'Logistik', 'Branche unbekannt']);
  });

  it('sortiert fällige Vertragsenden nach oben, erledigte und übrige ans Ende', () => {
    expect(sortForFollowUp(rows).map((row) => row.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('exportiert die Auswahl mit Branche, Vertragsende und Nachfass-Termin', () => {
    const csv = marketToCsv(rows.slice(0, 1));
    const [header, row] = csv.slice(1).split('\r\n');
    expect(header).toBe(
      'Firma;Ort;Branche;Hunter;Telefonassistenz;Gespräch am;Ergebnis;Gesprächspartner;Nettokontakt;Aktuelle Lösung;Wettbewerber;Vertragsende;Firma erloschen;Zentralentscheidung;Bestandskunde;Nicht mehr anrufen;Notiz;Nachfassen ab',
    );
    expect(row).toContain('Bau Fehn GmbH;Leer;Bau;Jonas Tiedemann;Nele Faber;');
    expect(row).toContain(';Wettbewerb (Mietservice);MEWA;03/2027;');
    expect(row?.endsWith(';01.06.2026')).toBe(true);
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
      expect(calls.every((call) => call.leadId && call.industry)).toBe(true);
      const rows = calls.map((call) => toMarketRow(call, region.id, '2026-10-08'));
      const summary = summarizeMarket(rows);
      expect(summary.competitor).toBeGreaterThan(calls.length / 4);
      // Die meisten Wettbewerbskunden mit Vertragsende, einige fällig, einige unbekannt
      expect(summary.followUpNow).toBeGreaterThan(0);
      expect(summary.contractUnknown).toBeGreaterThan(0);
      expect(summary.contractUnknown).toBeLessThan(summary.competitor / 2);
      const named = solutionBreakdown(rows).filter((slice) => slice.competitor && slice.count > 0);
      expect(named.map((slice) => slice.label)).toEqual(
        expect.arrayContaining(['MEWA', 'DBL', 'Bardusch', 'Alsco']),
      );
    }
  });
});
