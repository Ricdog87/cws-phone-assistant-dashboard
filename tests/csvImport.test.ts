import { describe, expect, it, vi } from 'vitest';
import {
  MAX_CONSECUTIVE_SERVICE_ERRORS,
  ImportAbortedError,
  importCsvRows,
  rowErrorsToCsv,
  validateCsvRows,
} from '@/data/csvImport';
import type { ColumnMapping } from '@/data/csvMapping';
import type { Geocoder } from '@/data/geocoding/types';
import { parseCsvText } from '@/data/providers/csvProvider';

const mapping: ColumnMapping = {
  id: 'ID',
  name: 'Firma',
  street: 'Straße',
  postalCode: 'PLZ',
  city: 'Ort',
  lat: 'Lat',
  lng: 'Lng',
  wearerCount: 'Träger',
  hasDirectDial: 'Durchwahl',
};

const content = [
  'ID;Firma;Straße;PLZ;Ort;Lat;Lng;Träger;Durchwahl',
  'A1;Mit Koordinaten;;;Leer;53,23;7,46;120;ja', // Zeile 2: gültig
  'A2;Nur Adresse;Hafenstr. 1;26721;Emden;;;80;nein', // Zeile 3: nachschlagen
  'A3;;;;Oldenburg;53,1;8,2;50;', // Zeile 4: Firmenname fehlt
  'A4;Falsche Werte;;;Leer;95;7,4;-3;vielleicht', // Zeile 5: drei Fehler
  'A1;Doppelte ID;;;Leer;53,2;7,4;10;', // Zeile 6: ID doppelt
  'A6;Ohne alles;;;;;;10;', // Zeile 7: keine Koordinaten, keine Adresse
  'A7;Unbekannte Adresse;Nirgendwo 1;;Nirgends;;;10;', // Zeile 8: nicht gefunden
].join('\n');

const rows = parseCsvText(content).rows;

function fakeGeocoder(impl?: Geocoder['geocode']): Geocoder {
  return {
    label: 'Test',
    geocode: vi.fn(
      impl ?? (async (q) => (q.city === 'Emden' ? { lat: 53.36, lng: 7.2, label: 'Emden' } : null)),
    ),
  };
}

describe('validateCsvRows', () => {
  it('liefert Fehler je Zeile mit Zeilennummer, Feld und Wert', () => {
    const result = validateCsvRows(rows, mapping);
    expect(result.valid.map((v) => [v.line, v.needsGeocoding])).toEqual([
      [2, false],
      [3, true],
      [7, false],
      [8, true],
    ]);
    expect(result.invalidRows).toBe(3);
    expect(result.missingCoordinateRows).toBe(1);
    expect(result.errors).toEqual([
      { line: 4, field: 'Firmenname', value: '', message: 'fehlt', reason: 'invalid' },
      {
        line: 5,
        field: 'Breitengrad',
        value: '95',
        message: 'liegt außerhalb von ±90',
        reason: 'invalid',
      },
      {
        line: 5,
        field: 'Trägerzahl',
        value: '-3',
        message: 'muss eine ganze Zahl ab 0 sein',
        reason: 'invalid',
      },
      {
        line: 5,
        field: 'Durchwahl bekannt',
        value: 'vielleicht',
        message: 'ist kein Ja/Nein-Wert',
        reason: 'invalid',
      },
      { line: 6, field: 'ID', value: 'A1', message: 'kommt mehrfach vor', reason: 'invalid' },
      {
        line: 7,
        field: 'Koordinaten',
        value: '',
        message: 'fehlen, ohne Adresse erscheint der Lead nicht auf der Karte',
        reason: 'missing_coordinates',
      },
    ]);
  });
});

describe('importCsvRows', () => {
  it('schlägt fehlende Koordinaten nach und behält Leads ohne Kartenposition', async () => {
    const geocoder = fakeGeocoder();
    const progress: number[] = [];
    const { leads, report } = await importCsvRows(rows, mapping, {
      geocoder,
      onProgress: (p) => progress.push(p.done),
    });

    expect(leads.map((l) => [l.id, l.lat, l.lng])).toEqual([
      ['A1', 53.23, 7.46],
      ['A2', 53.36, 7.2],
      ['A6', null, null],
      ['A7', null, null],
    ]);
    expect(leads[0]).toMatchObject({ wearerCount: 120, hasDirectDial: true });
    expect(report).toMatchObject({
      total: 7,
      loaded: 4,
      geocoded: 1,
      withoutCoordinates: 2,
      rejectedInvalid: 3,
    });
    expect(report.rowErrors.at(-1)).toMatchObject({
      line: 8,
      field: 'Adresse',
      value: 'Nirgendwo 1, Nirgends',
      message: 'Adresse nicht gefunden',
      reason: 'geocode_failed',
    });
    expect(geocoder.geocode).toHaveBeenCalledWith(
      { street: 'Hafenstr. 1', postalCode: '26721', city: 'Emden' },
      undefined,
    );
    expect(progress).toEqual([0, 1, 2]);
  });

  it('lädt ohne Nachschlagen alle gültigen Zeilen, nur ohne Kartenposition', async () => {
    const { leads, report } = await importCsvRows(rows, mapping, { geocoder: null });
    expect(report.loaded).toBe(4);
    expect(report.withoutCoordinates).toBe(3);
    expect(leads.find((lead) => lead.id === 'A2')).toMatchObject({ lat: null, lng: null });
  });

  it('übernimmt Accountinhaber und letzte Aktivität aus dem Salesforce-Bericht', async () => {
    const report = parseCsvText(
      [
        'Accountname;Accountinhaber;Letzte Aktivität;Stadt (Rechnungsanschrift)',
        'Beispiel GmbH;Erika Hunter;15.09.2026;Leer',
        'Zweite GmbH;Erika Hunter;;Emden',
      ].join('\n'),
    );
    const { leads } = await importCsvRows(
      report.rows,
      {
        name: 'Accountname',
        owner: 'Accountinhaber',
        lastActivity: 'Letzte Aktivität',
        city: 'Stadt (Rechnungsanschrift)',
      },
      { geocoder: null },
    );
    expect(leads.map((lead) => [lead.owner, lead.lastActivity])).toEqual([
      ['Erika Hunter', '2026-09-15'],
      ['Erika Hunter', null],
    ]);
  });

  it('meldet ein ungültiges Datum der letzten Aktivität', () => {
    const result = validateCsvRows([{ Firma: 'X', Aktiv: 'gestern', Ort: 'Leer' }], {
      name: 'Firma',
      lastActivity: 'Aktiv',
      city: 'Ort',
    });
    expect(result.errors[0]).toMatchObject({
      field: 'Letzte Aktivität',
      message: 'ist kein Datum (TT.MM.JJJJ)',
    });
  });

  it('bricht das Nachschlagen nach wiederholten Dienstfehlern ab', async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      ID: `X${i}`,
      Firma: `F${i}`,
      Ort: 'Leer',
    }));
    const geocoder = fakeGeocoder(async () => {
      throw new Error('offline');
    });
    const { report } = await importCsvRows(many, mapping, { geocoder });
    expect(geocoder.geocode).toHaveBeenCalledTimes(MAX_CONSECUTIVE_SERVICE_ERRORS);
    expect(report.withoutCoordinates).toBe(6);
    expect(report.loaded).toBe(6);
    expect(report.rowErrors.at(-1)?.message).toBe('nicht nachgeschlagen, Dienst nicht erreichbar');
  });

  it('bricht auf Wunsch ab', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      importCsvRows(rows, mapping, { geocoder: fakeGeocoder(), signal: controller.signal }),
    ).rejects.toBeInstanceOf(ImportAbortedError);
  });
});

describe('rowErrorsToCsv', () => {
  it('schreibt BOM und Semikolon', () => {
    const csv = rowErrorsToCsv([
      { line: 4, field: 'Firmenname', value: '', message: 'fehlt', reason: 'invalid' },
    ]);
    expect(csv).toBe('\uFEFFZeile;Feld;Wert;Fehler;Art\r\n4;Firmenname;;fehlt;Ungültiger Wert\r\n');
  });
});
