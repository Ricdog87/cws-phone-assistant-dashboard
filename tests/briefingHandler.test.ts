import { describe, expect, it, vi } from 'vitest';
import { handleBriefingRequest, readLlmConfig, type LlmConfig } from '../server/briefingHandler';
import { buildBriefingRequest } from '@/data/briefing/prompt';
import { makeLead } from './fixtures';

const config: LlmConfig = {
  apiUrl: 'https://llm.example.org/v1/chat/completions',
  apiKey: 'geheimer-schluessel',
  model: 'testmodell',
  authHeader: 'Authorization',
  timeoutMs: 1000,
};

const request = buildBriefingRequest(
  makeLead({ city: 'Oldenburg', industry: 'Metallbau', certification: 'ISO 9001' }),
  3.1,
);

const answer = {
  aufhaenger: ['Zertifizierung ISO 9001'],
  einstiegssatz: 'Guten Tag {{ansprechpartner}}, passt ein kurzer Termin?',
  einwandbehandlung: [],
};

const completion = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe('readLlmConfig', () => {
  it('braucht URL, Schlüssel und Modell', () => {
    expect(readLlmConfig({})).toBeNull();
    expect(readLlmConfig({ LLM_API_URL: 'u', LLM_API_KEY: 'k' })).toBeNull();
    expect(readLlmConfig({ LLM_API_URL: 'u', LLM_API_KEY: 'k', LLM_MODEL: 'm' })).toEqual({
      apiUrl: 'u',
      apiKey: 'k',
      model: 'm',
      authHeader: 'Authorization',
      timeoutMs: 12000,
    });
  });
});

describe('handleBriefingRequest', () => {
  it('meldet 503 ohne Konfiguration', async () => {
    const result = await handleBriefingRequest(request, null, { log: vi.fn() });
    expect(result.status).toBe(503);
  });

  it('weist Anfragen mit zusätzlichen Feldern ab', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const result = await handleBriefingRequest({ ...request, firma: 'X' }, config, {
      fetchFn,
      log: vi.fn(),
    });
    expect(result.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('ruft den Endpunkt mit strikter JSON-Ausgabe auf und prüft die Antwort', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => completion(JSON.stringify(answer)));
    const result = await handleBriefingRequest(request, config, { fetchFn, log: vi.fn() });
    expect(result).toEqual({ status: 200, body: answer });

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(config.apiUrl);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer geheimer-schluessel',
    );
    const sent = JSON.parse(String(init.body)) as {
      model: string;
      response_format: { type: string; json_schema: { strict: boolean } };
    };
    expect(sent.model).toBe('testmodell');
    expect(sent.response_format.type).toBe('json_schema');
    expect(sent.response_format.json_schema.strict).toBe(true);
  });

  it('nutzt eine eigene Kopfzeile ohne Bearer, wenn konfiguriert', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => completion(JSON.stringify(answer)));
    await handleBriefingRequest(
      request,
      { ...config, authHeader: 'api-key' },
      { fetchFn, log: vi.fn() },
    );
    const init = (fetchFn.mock.calls[0] as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['api-key']).toBe('geheimer-schluessel');
  });

  it('meldet 502 bei Antworten außerhalb des Schemas oder Fehlern des Modells', async () => {
    const invalid = await handleBriefingRequest(request, config, {
      fetchFn: async () => completion('{"aufhaenger": []}'),
      log: vi.fn(),
    });
    expect(invalid.status).toBe(502);
    const notJson = await handleBriefingRequest(request, config, {
      fetchFn: async () => completion('Hier ist Ihr Briefing'),
      log: vi.fn(),
    });
    expect(notJson.status).toBe(502);
    const upstream = await handleBriefingRequest(request, config, {
      fetchFn: async () => new Response('', { status: 429 }),
      log: vi.fn(),
    });
    expect(upstream.status).toBe(502);
  });

  it('meldet 504 bei Zeitüberschreitung', async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('abort'))),
      );
    const result = await handleBriefingRequest(
      request,
      { ...config, timeoutMs: 20 },
      { fetchFn: hanging, log: vi.fn() },
    );
    expect(result).toEqual({ status: 504, body: { error: 'zeitueberschreitung' } });
  });

  it('protokolliert weder Lead-Daten noch Modellantwort noch Schlüssel', async () => {
    const log = vi.fn();
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await handleBriefingRequest(request, config, {
      fetchFn: async () => completion(JSON.stringify(answer)),
      log,
    });
    await handleBriefingRequest(request, config, { fetchFn: async () => completion('kaputt') });
    const logged = JSON.stringify([log.mock.calls, info.mock.calls]);
    for (const secret of ['Oldenburg', 'Metallbau', 'ISO 9001', 'Termin', 'geheimer-schluessel']) {
      expect(logged).not.toContain(secret);
    }
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'ok', status: 200 }));
    info.mockRestore();
  });
});
