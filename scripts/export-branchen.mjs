import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Wie src/domain/export.ts: Semikolon, CRLF und UTF-8-BOM für Excel. */
const CSV_BOM = '\uFEFF';
const CSV_SEPARATOR = ';';

const HEADER = ['Branche', 'Grundwert', 'Begruendung', 'Status', 'Kommentar Vertrieb'];

function escapeCsvCell(value) {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * @param {Record<string, { grundwert: number, begruendung: string, status: string }>} catalog
 */
export function industryBasesToCsv(catalog) {
  const rows = Object.entries(catalog)
    .sort(([, a], [, b]) => b.grundwert - a.grundwert)
    .map(([industry, entry]) =>
      [industry, String(entry.grundwert), entry.begruendung, entry.status, '']
        .map((cell) => escapeCsvCell(cell))
        .join(CSV_SEPARATOR),
    );
  return `${CSV_BOM}${[HEADER.join(CSV_SEPARATOR), ...rows].join('\r\n')}\r\n`;
}

function isDirectRun() {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const catalog = JSON.parse(readFileSync(resolve(root, 'src/domain/branchen.json'), 'utf8'));
  const target = resolve(root, 'export/branchengrundwerte.csv');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, industryBasesToCsv(catalog), 'utf8');
  console.log('geschrieben: export/branchengrundwerte.csv');
}
