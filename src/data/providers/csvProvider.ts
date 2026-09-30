import Papa from 'papaparse';
import type { Lead } from '@/domain/types';
import { mapCsvRows, type ColumnMapping } from '../csvMapping';
import type { LeadProvider, LoadReport } from './types';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Liest eine CSV-Datei. Trennzeichen (Komma oder Semikolon) wird automatisch erkannt. */
export function parseCsvText(content: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(content.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t'],
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

export async function readCsvFile(file: File): Promise<ParsedCsv> {
  return parseCsvText(await file.text());
}

/** Datenquelle aus einer hochgeladenen CSV-Datei mit Spaltenzuordnung aus dem UI */
export class CsvProvider implements LeadProvider {
  readonly id = 'csv' as const;
  readonly label = 'CSV-Import';
  private report: LoadReport | null = null;

  constructor(
    private readonly csv: ParsedCsv,
    private readonly mapping: ColumnMapping,
  ) {}

  async load(): Promise<Lead[]> {
    const { leads, report } = mapCsvRows(this.csv.rows, this.mapping);
    this.report = report;
    return leads;
  }

  getReport(): LoadReport | null {
    return this.report;
  }
}
