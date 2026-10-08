import { describe, expect, it } from 'vitest';
import { importCsvRows } from '@/data/csvImport';
import { parseCsvText } from '@/data/providers/csvProvider';
import branchen from '@/domain/branchen.json';
import { NACE_TO_INDUSTRY, industryForNace, naceDivision } from '@/domain/nace';

describe('NACE Ebene 2', () => {
  it('ordnet nur Branchen zu, die das Scoring kennt', () => {
    const known = Object.keys(branchen);
    for (const industry of Object.values(NACE_TO_INDUSTRY)) expect(known).toContain(industry);
  });

  it('liest die Abteilung aus verschiedenen Schreibweisen', () => {
    expect(naceDivision('25')).toBe('25');
    expect(naceDivision('25.11')).toBe('25');
    expect(naceDivision('C 28')).toBe('28');
    expect(naceDivision('')).toBeNull();
  });

  it('liefert die Branche oder null für nicht zugeordnete Codes', () => {
    expect(industryForNace('25')).toBe('Metallbau');
    expect(industryForNace('41')).toBe('Bau');
    expect(industryForNace('86')).toBe('Gesundheit und Pflege');
    expect(industryForNace('84')).toBeNull();
    expect(industryForNace(null)).toBeNull();
  });

  it('setzt beim Import die Branche aus dem NACE-Code, sonst die aus dem Bericht', async () => {
    const csv = parseCsvText(
      [
        'Accountname;NACE Ebene 2;Branchenebene 2;Stadt (Rechnungsanschrift)',
        'Stahl GmbH;25;Metallverarbeitung;Leer',
        'Gemeinde Beispiel;84;Städte & Kommunen;Emden',
      ].join('\n'),
    );
    const { leads } = await importCsvRows(
      csv.rows,
      {
        name: 'Accountname',
        naceCode: 'NACE Ebene 2',
        industry: 'Branchenebene 2',
        city: 'Stadt (Rechnungsanschrift)',
      },
      { geocoder: null },
    );
    expect(leads.map((lead) => lead.industry)).toEqual(['Metallbau', 'Städte & Kommunen']);
  });
});
