import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import branchen from '@/domain/branchen.json';
import { industryBasesToCsv } from '../scripts/export-branchen.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('industryBasesToCsv', () => {
  it('sortiert nach Grundwert absteigend und maskiert Sonderzeichen', () => {
    const csv = industryBasesToCsv({
      'A;B': { grundwert: 10, begruendung: 'Zitat "x"', status: 'vorlaeufig' },
      Alpha: { grundwert: 20, begruendung: 'Text, mit Komma', status: 'abgestimmt' },
    });
    expect(csv).toBe(
      '\uFEFFBranche;Grundwert;Begruendung;Status;Kommentar Vertrieb\r\n' +
        'Alpha;20;Text, mit Komma;abgestimmt;\r\n' +
        '"A;B";10;"Zitat ""x""";vorlaeufig;\r\n',
    );
  });

  it('behält bei gleichem Grundwert die Reihenfolge der Quelle', () => {
    const csv = industryBasesToCsv({
      Metallbau: { grundwert: 80, begruendung: 'Erst', status: 'vorlaeufig' },
      Logistik: { grundwert: 80, begruendung: 'Zweit', status: 'vorlaeufig' },
    });
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[1]).toBe('Metallbau;80;Erst;vorlaeufig;');
    expect(lines[2]).toBe('Logistik;80;Zweit;vorlaeufig;');
  });

  it('exportiert die Branchen absteigend mit Umlauten und leerer Kommentarspalte', () => {
    const csv = industryBasesToCsv(branchen);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Branche;Grundwert;Begruendung;Status;Kommentar Vertrieb');
    expect(lines[1]).toMatch(/^Fleischverarbeitung;95;/);
    expect(lines[2]).toContain('regelmäßig');
    expect(lines[11]).toMatch(/^Handel;55;/);
    expect(lines).toHaveLength(12);
    const scores = lines.slice(1).map((line) => Number(line.split(';')[1]));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    for (const line of lines.slice(1)) {
      expect(line.endsWith(';')).toBe(true);
    }
  });
});

describe('export:branchen', () => {
  it('schreibt export/branchengrundwerte.csv als UTF-8 mit BOM', () => {
    execFileSync(process.execPath, ['scripts/export-branchen.mjs'], { cwd: root });
    const bytes = readFileSync(resolve(root, 'export/branchengrundwerte.csv'));
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(bytes.toString('utf8')).toBe(industryBasesToCsv(branchen));
  });
});
