import { describe, expect, it } from 'vitest';
import { mapCsvRows, parseBoolean, parseNumber, suggestMapping } from '@/data/csvMapping';
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
  it('erkennt ja, x und 1', () => {
    expect(parseBoolean('Ja')).toBe(true);
    expect(parseBoolean('x')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('nein')).toBe(false);
    expect(parseBoolean(undefined)).toBe(false);
  });
});

describe('CSV-Import', () => {
  const content =
    '\uFEFFFirma;Ort;Breitengrad;Längengrad;Trägerzahl;Durchwahl\n' +
    'Betrieb A;Leer;53,23;7,46;120;ja\n' +
    'Betrieb B;Emden;;;80;nein\n' +
    ';Oldenburg;53,14;8,21;50;\n';

  it('schlägt die Spaltenzuordnung vor und verwirft Zeilen ohne Koordinaten', () => {
    const csv = parseCsvText(content);
    const mapping = suggestMapping(csv.headers);
    expect(mapping).toMatchObject({
      name: 'Firma',
      city: 'Ort',
      lat: 'Breitengrad',
      lng: 'Längengrad',
    });

    const { leads, report } = mapCsvRows(csv.rows, mapping);
    expect(report).toEqual({
      total: 3,
      loaded: 1,
      rejectedMissingCoordinates: 1,
      rejectedOther: 1,
    });
    expect(leads[0]).toMatchObject({
      name: 'Betrieb A',
      lat: 53.23,
      lng: 7.46,
      wearerCount: 120,
      hasDirectDial: true,
      id: 'CSV-0001',
    });
  });
});
