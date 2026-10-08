import { describe, expect, it } from 'vitest';
import { mappingProblems, parseBoolean, parseNumber, suggestMapping } from '@/data/csvMapping';
import { parseCsvText } from '@/data/providers/csvProvider';

describe('parseNumber', () => {
  it('liest deutsches und englisches Format', () => {
    expect(parseNumber('53,1234')).toBe(53.1234);
    expect(parseNumber('53.1234')).toBe(53.1234);
    expect(parseNumber('1.250,5')).toBe(1250.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('parseBoolean', () => {
  it('erkennt ja und nein, unbekannte Werte ergeben null', () => {
    expect(parseBoolean('Ja')).toBe(true);
    expect(parseBoolean('x')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('nein')).toBe(false);
    expect(parseBoolean('')).toBe(false);
    expect(parseBoolean(undefined)).toBe(false);
    expect(parseBoolean('vielleicht')).toBeNull();
  });
});

describe('suggestMapping', () => {
  it('erkennt deutsche Spaltennamen', () => {
    const csv = parseCsvText(
      '\uFEFFFirma;Ort;Breitengrad;Längengrad;Trägerzahl\nA;Leer;53,2;7,4;10\n',
    );
    expect(suggestMapping(csv.headers)).toMatchObject({
      name: 'Firma',
      city: 'Ort',
      lat: 'Breitengrad',
      lng: 'Längengrad',
      wearerCount: 'Trägerzahl',
    });
  });
});

describe('suggestMapping ohne Mehrfachbelegung', () => {
  it('ordnet eine Spalte nur einem Zielfeld zu', () => {
    const mapping = suggestMapping(['Kunde', 'Bestandskunde', 'Stellen']);
    expect(mapping).toEqual({ isCustomer: 'Bestandskunde', openPositions: 'Stellen' });
  });
});

describe('mappingProblems', () => {
  it('verlangt nur den Firmennamen, Adresse und Koordinaten sind für die Karte optional', () => {
    expect(mappingProblems({})).toEqual(['Firmenname ist nicht zugeordnet.']);
    expect(mappingProblems({ name: 'Firma' })).toEqual([]);
    expect(mappingProblems({ name: 'Firma', city: 'Ort' })).toEqual([]);
    expect(mappingProblems({ name: 'Firma', lat: 'Lat', lng: 'Lng' })).toEqual([]);
    expect(mappingProblems({ name: 'Firma', city: 'Ort', lat: 'Lat' })).toEqual([
      'Breiten- und Längengrad nur gemeinsam zuordnen.',
    ]);
  });
});

describe('suggestMapping für Salesforce-Berichte', () => {
  it('erkennt die Spalten des Account-Berichts ohne Handarbeit', () => {
    const headers = [
      'Accountinhaber',
      'WW Accountinhaber',
      'Account-ID',
      'Accountname',
      'Status WW',
      'Telefon',
      'Letzte Aktivität',
      'PLZ (Rechnungsanschrift)',
      'Stadt (Rechnungsanschrift)',
      'Mitarbeiter',
      'NACE Ebene 2',
      'Branchenebene 2',
      'WW Inhaber-Team',
    ];
    expect(suggestMapping(headers)).toEqual({
      id: 'Account-ID',
      name: 'Accountname',
      industry: 'Branchenebene 2',
      naceCode: 'NACE Ebene 2',
      postalCode: 'PLZ (Rechnungsanschrift)',
      city: 'Stadt (Rechnungsanschrift)',
      commercialEmployees: 'Mitarbeiter',
      phone: 'Telefon',
      owner: 'Accountinhaber',
      lastActivity: 'Letzte Aktivität',
    });
  });

  it('bevorzugt die Lieferanschrift vor der Rechnungsanschrift', () => {
    const mapping = suggestMapping([
      'Straße (Rechnungsanschrift)',
      'Straße (Lieferanschrift)',
      'Ort (Rechnungsanschrift)',
      'Ort (Lieferanschrift)',
    ]);
    expect(mapping.street).toBe('Straße (Lieferanschrift)');
    expect(mapping.city).toBe('Ort (Lieferanschrift)');
  });
});
