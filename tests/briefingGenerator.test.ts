import { describe, expect, it, vi } from 'vitest';
import { FallbackBriefingGenerator } from '@/data/briefing/fallbackGenerator';
import { BriefingError, LlmBriefingGenerator } from '@/data/briefing/llmGenerator';
import { buildBriefingRequest, fillPlaceholders } from '@/data/briefing/prompt';
import { RuleBasedBriefingGenerator } from '@/data/briefing/ruleBasedGenerator';
import { briefingRequestSchema, llmBriefingSchema } from '@/data/briefing/schema';
import type { QueueEntry } from '@/domain/types';
import { makeLead } from './fixtures';

const lead = makeLead({
  name: 'Geheimbetrieb GmbH',
  contactName: 'Frau Janssen',
  contactRole: 'Einkauf',
  phone: '+49 441 0000-123',
  street: 'Hafenstraße 1',
  openPositions: 3,
});

const entry: QueueEntry = {
  lead,
  distanceKm: 0.4,
  detourMinutes: 3.1,
  inCorridor: true,
  dimensions: { fit: 88, proximity: 90, potential: 40, reachability: 70 },
  score: 75,
  band: 'B',
  isControl: false,
  position: 1,
};

const modelAnswer = {
  aufhaenger: ['Drei offene Stellen bei {{firma}}'],
  einstiegssatz:
    'Guten Tag {{ansprechpartner}}, hier ist [Name] von CWS Workwear. Passt ein kurzer Termin?',
  einwandbehandlung: [
    'Einwand: Kein Bedarf. Antwort: Verstehe, darf ich kurz fragen, wie Sie heute waschen?',
  ],
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('buildBriefingRequest', () => {
  it('übermittelt keine Namen, Telefonnummern oder Straßen', () => {
    const request = buildBriefingRequest(lead, 3.1);
    const serialized = JSON.stringify(request);
    for (const secret of ['Geheimbetrieb', 'Janssen', '0000-123', 'Hafenstraße']) {
      expect(serialized).not.toContain(secret);
    }
    expect(request).toMatchObject({
      ansprechpartnerBekannt: true,
      funktionAnsprechpartner: 'Einkauf',
    });
    expect(briefingRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe('fillPlaceholders', () => {
  it('setzt Firma und Ansprechpartner ein', () => {
    expect(
      fillPlaceholders('Guten Tag {{ansprechpartner}}, bei {{firma}}.', {
        company: 'Muster GmbH',
        contact: 'Herr Meyer',
      }),
    ).toBe('Guten Tag Herr Meyer, bei Muster GmbH.');
  });

  it('entfernt den Platzhalter ohne Ansprechpartner sauber', () => {
    expect(
      fillPlaceholders('Guten Tag {{ansprechpartner}}, hier ist [Name].', {
        company: 'X',
        contact: null,
      }),
    ).toBe('Guten Tag, hier ist [Name].');
  });
});

describe('llmBriefingSchema', () => {
  it('ist strikt', () => {
    expect(llmBriefingSchema.safeParse(modelAnswer).success).toBe(true);
    expect(llmBriefingSchema.safeParse({ ...modelAnswer, extra: 1 }).success).toBe(false);
    expect(llmBriefingSchema.safeParse({ ...modelAnswer, aufhaenger: [] }).success).toBe(false);
    const missing = {
      aufhaenger: modelAnswer.aufhaenger,
      einstiegssatz: modelAnswer.einstiegssatz,
    };
    expect(llmBriefingSchema.safeParse(missing).success).toBe(false);
  });
});

describe('LlmBriefingGenerator', () => {
  it('liefert das Briefing mit eingesetzten Namen und speichert es zwischen', async () => {
    const fetchFn = vi.fn(async () => ok(modelAnswer));
    const generator = new LlmBriefingGenerator({ endpoint: '/api/briefing', fetchFn });
    const result = await generator.generate(entry);
    expect(result).toEqual({
      hooks: ['Drei offene Stellen bei Geheimbetrieb GmbH'],
      openingLine:
        'Guten Tag Frau Janssen, hier ist [Name] von CWS Workwear. Passt ein kurzer Termin?',
      objectionHandling: modelAnswer.einwandbehandlung,
      source: 'llm',
    });
    await generator.generate(entry);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(String(init.body)).not.toContain('Janssen');
  });

  it('wirft bei HTTP-Fehler, ungültiger Antwort und Zeitüberschreitung', async () => {
    await expect(
      new LlmBriefingGenerator({
        fetchFn: async () => new Response('{}', { status: 503 }),
      }).generate(entry),
    ).rejects.toMatchObject({ category: 'http' });
    await expect(
      new LlmBriefingGenerator({ fetchFn: async () => ok({ aufhaenger: 'kein Array' }) }).generate(
        entry,
      ),
    ).rejects.toMatchObject({ category: 'invalid_response' });
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
      );
    await expect(
      new LlmBriefingGenerator({ fetchFn: hanging, timeoutMs: 20 }).generate(entry),
    ).rejects.toMatchObject({
      category: 'timeout',
    });
  });

  it('versucht es nach einem Fehler erneut', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(ok(modelAnswer));
    const generator = new LlmBriefingGenerator({ fetchFn });
    await expect(generator.generate(entry)).rejects.toBeInstanceOf(BriefingError);
    await expect(generator.generate(entry)).resolves.toMatchObject({ source: 'llm' });
  });
});

describe('FallbackBriefingGenerator', () => {
  it('greift bei Ausfall auf die Regeln zurück und protokolliert keine Lead-Daten', async () => {
    const warn = vi.fn();
    const rules = new RuleBasedBriefingGenerator();
    const generator = new FallbackBriefingGenerator(
      new LlmBriefingGenerator({
        fetchFn: async () => Promise.reject(new TypeError('Failed to fetch')),
      }),
      rules,
      warn,
    );
    const result = await generator.generate(entry);
    expect(result).toEqual({ ...rules.build(entry), fallbackReason: 'Netzwerkfehler' });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    for (const secret of ['Geheimbetrieb', 'Janssen', '0000-123', 'Oldenburg', 'L-1']) {
      expect(logged).not.toContain(secret);
    }
  });

  it('liefert das Ergebnis des Sprachmodells, wenn es verfügbar ist', async () => {
    const generator = new FallbackBriefingGenerator(
      new LlmBriefingGenerator({ fetchFn: async () => ok(modelAnswer) }),
      new RuleBasedBriefingGenerator(),
      vi.fn(),
    );
    expect((await generator.generate(entry)).source).toBe('llm');
  });
});

describe('RuleBasedBriefingGenerator', () => {
  it('bleibt der Standard und kommt ohne Einwandbehandlung aus', async () => {
    const result = await new RuleBasedBriefingGenerator().generate(entry);
    expect(result.source).toBe('rules');
    expect(result.hooks[0]).toBe('3 offene Stellen im gewerblichen Bereich');
    expect(result.objectionHandling).toEqual([]);
  });
});
