import type { QueueEntry } from '@/domain/types';
import { buildBriefingRequest, fillPlaceholders } from './prompt';
import { llmBriefingSchema } from './schema';
import type { BriefingGenerator, GeneratedBriefing } from './types';

export const DEFAULT_BRIEFING_ENDPOINT = '/api/briefing';
export const LLM_CLIENT_TIMEOUT_MS = 15000;

/** Fehlerkategorien ohne Lead-Daten, geeignet für Log und Oberfläche */
export class BriefingError extends Error {
  constructor(
    readonly category: 'http' | 'timeout' | 'invalid_response' | 'network' | 'aborted',
    detail = '',
  ) {
    super(detail ? `${category}: ${detail}` : category);
    this.name = 'BriefingError';
  }
}

export interface LlmGeneratorOptions {
  endpoint?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Ruft über den eigenen Proxy ein Sprachmodell auf. Der API-Schlüssel liegt
 * ausschließlich beim Proxy. Ergebnisse werden je Merkmalssatz zwischengespeichert.
 */
export class LlmBriefingGenerator implements BriefingGenerator {
  readonly label = 'Sprachmodell';
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly cache = new Map<string, Promise<GeneratedBriefingTemplate>>();

  constructor(options: LlmGeneratorOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_BRIEFING_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? LLM_CLIENT_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
  }

  async generate(entry: QueueEntry, signal?: AbortSignal): Promise<GeneratedBriefing> {
    const request = buildBriefingRequest(entry.lead);
    const key = JSON.stringify(request);
    let pending = this.cache.get(key);
    if (!pending) {
      pending = this.request(key, signal);
      this.cache.set(key, pending);
      // Fehlschläge nicht zwischenspeichern
      pending.catch(() => this.cache.delete(key));
    }
    const template = await pending;
    const values = { company: entry.lead.name, contact: entry.lead.contactName };
    return {
      hooks: template.hooks.map((h) => fillPlaceholders(h, values)),
      openingLine: fillPlaceholders(template.openingLine, values),
      objectionHandling: template.objectionHandling.map((o) => fillPlaceholders(o, values)),
      source: 'llm',
    };
  }

  private async request(body: string, signal?: AbortSignal): Promise<GeneratedBriefingTemplate> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new BriefingError('timeout')), this.timeoutMs);
    const onAbort = () => controller.abort(new BriefingError('aborted'));
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      let response: Response;
      try {
        response = await this.fetchFn(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        const reason: unknown = controller.signal.reason;
        if (reason instanceof BriefingError) throw reason;
        throw new BriefingError('network', error instanceof Error ? error.name : '');
      }
      if (!response.ok) throw new BriefingError('http', String(response.status));
      const parsed = llmBriefingSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new BriefingError('invalid_response');
      return {
        hooks: parsed.data.aufhaenger,
        openingLine: parsed.data.einstiegssatz,
        objectionHandling: parsed.data.einwandbehandlung,
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

interface GeneratedBriefingTemplate {
  hooks: string[];
  openingLine: string;
  objectionHandling: string[];
}
