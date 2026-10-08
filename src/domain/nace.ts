/**
 * NACE Ebene 2 (WZ-2008-Abteilung) auf die Branchen im Scoring, siehe branchen.json.
 * Entscheidung vom 08.10.2026, vorläufig. Codes ohne Eintrag behalten die Branche aus
 * der Quelle und erhalten den neutralen Grundwert. Fleischverarbeitung lässt sich erst
 * ab NACE Ebene 4 erkennen und fällt hier unter Lebensmittelproduktion.
 */
export const NACE_TO_INDUSTRY: Readonly<Record<string, string>> = {
  '10': 'Lebensmittelproduktion',
  '11': 'Lebensmittelproduktion',
  '20': 'Chemie',
  '24': 'Metallbau',
  '25': 'Metallbau',
  '28': 'Maschinenbau',
  '33': 'Maschinenbau',
  '41': 'Bau',
  '42': 'Bau',
  '43': 'Bau',
  '45': 'Kfz-Werkstatt',
  '46': 'Handel',
  '47': 'Handel',
  '49': 'Logistik',
  '52': 'Logistik',
  '53': 'Logistik',
  '55': 'Gastronomie',
  '56': 'Gastronomie',
  '86': 'Gesundheit und Pflege',
  '87': 'Gesundheit und Pflege',
  '88': 'Gesundheit und Pflege',
};

/** Abteilung (zweistellig) aus Angaben wie „25“, „25.11“ oder „C 25“, sonst null */
export function naceDivision(raw: string | null | undefined): string | null {
  const match = /(\d{2})/.exec(raw ?? '');
  return match?.[1] ?? null;
}

/** Branche im Scoring zum NACE-Code oder null, wenn der Code keiner Branche zugeordnet ist */
export function industryForNace(raw: string | null | undefined): string | null {
  const division = naceDivision(raw);
  return division ? (NACE_TO_INDUSTRY[division] ?? null) : null;
}
