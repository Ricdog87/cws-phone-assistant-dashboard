import { z } from 'zod';

// Nur relative Importe: diese Datei wird auch vom Proxy im Vite-Server geladen

/** Antwort des Sprachmodells, strikt: keine zusätzlichen Felder */
export const llmBriefingSchema = z.strictObject({
  aufhaenger: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
  einstiegssatz: z.string().trim().min(1).max(600),
  einwandbehandlung: z.array(z.string().trim().min(1).max(400)).max(5),
});

export type LlmBriefing = z.output<typeof llmBriefingSchema>;

/**
 * JSON-Schema für die strukturierte Ausgabe des Modells. Bewusst ohne Längenangaben,
 * weil nicht jeder Anbieter sie im strikten Modus unterstützt. Längen prüft Zod.
 */
export const BRIEFING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['aufhaenger', 'einstiegssatz', 'einwandbehandlung'],
  properties: {
    aufhaenger: { type: 'array', items: { type: 'string' } },
    einstiegssatz: { type: 'string' },
    einwandbehandlung: { type: 'array', items: { type: 'string' } },
  },
} as const;

/**
 * Anfrage vom Browser an den Proxy. Enthält nur Merkmale, keine Namen,
 * keine Telefonnummern und keine Adresse unterhalb der Ortsebene.
 */
export const briefingRequestSchema = z.strictObject({
  branche: z.string().max(100),
  ort: z.string().max(100),
  gewerblicheMitarbeitende: z.number().int().min(0).max(1_000_000),
  traegerzahl: z.number().int().min(0).max(1_000_000),
  offeneStellen: z.number().int().min(0).max(10_000),
  zertifizierung: z.string().max(100).nullable(),
  standorterweiterung: z.boolean(),
  wechselGeschaeftsfuehrung: z.boolean(),
  ansprechpartnerBekannt: z.boolean(),
  funktionAnsprechpartner: z.string().max(100).nullable(),
  durchwahlBekannt: z.boolean(),
  umwegMinuten: z.number().min(0).max(1000),
});

export type BriefingRequest = z.output<typeof briefingRequestSchema>;
