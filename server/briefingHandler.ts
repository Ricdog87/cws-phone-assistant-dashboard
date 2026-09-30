import { buildUserPrompt, SYSTEM_PROMPT } from '../src/data/briefing/prompt';
import {
  BRIEFING_JSON_SCHEMA,
  briefingRequestSchema,
  llmBriefingSchema,
  type LlmBriefing,
} from '../src/data/briefing/schema';

/** Konfiguration aus .env. Wird nur serverseitig gelesen und nie an den Browser gegeben. */
export interface LlmConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  /** Kopfzeile für den Schlüssel. Bei Authorization wird "Bearer " vorangestellt. */
  authHeader: string;
  timeoutMs: number;
}

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 12000;

export function readLlmConfig(env: Record<string, string | undefined>): LlmConfig | null {
  const apiUrl = env.LLM_API_URL?.trim();
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!apiUrl || !apiKey || !model) return null;
  const timeout = Number(env.LLM_TIMEOUT_MS);
  return {
    apiUrl,
    apiKey,
    model,
    authHeader: env.LLM_AUTH_HEADER?.trim() || 'Authorization',
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_UPSTREAM_TIMEOUT_MS,
  };
}

export interface HandlerResult {
  status: number;
  body: LlmBriefing | { error: string };
}

/** Protokoll ohne Inhalte: nur Ereignis, Status und Dauer */
export type LogFn = (entry: { event: string; status: number; ms: number }) => void;

export interface HandlerDeps {
  fetchFn?: typeof fetch;
  log?: LogFn;
  now?: () => number;
}

const defaultLog: LogFn = ({ event, status, ms }) =>
  console.info(`[briefing] ${event} status=${status} dauer=${ms}ms`);

function authValue(config: LlmConfig): string {
  return config.authHeader.toLowerCase() === 'authorization'
    ? `Bearer ${config.apiKey}`
    : config.apiKey;
}

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return null;
  const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
  return typeof message?.content === 'string' ? message.content : null;
}

/**
 * Nimmt die Merkmale aus dem Browser entgegen, ruft einen OpenAI-kompatiblen
 * Chat-Endpunkt mit strikter JSON-Ausgabe auf und prüft die Antwort mit Zod.
 */
export async function handleBriefingRequest(
  body: unknown,
  config: LlmConfig | null,
  deps: HandlerDeps = {},
): Promise<HandlerResult> {
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? (() => Date.now());
  const fetchFn = deps.fetchFn ?? ((input, init) => fetch(input, init));
  const started = now();
  const done = (event: string, result: HandlerResult): HandlerResult => {
    log({ event, status: result.status, ms: now() - started });
    return result;
  };

  if (!config)
    return done('nicht_konfiguriert', { status: 503, body: { error: 'not_configured' } });

  const request = briefingRequestSchema.safeParse(body);
  if (!request.success)
    return done('anfrage_ungueltig', { status: 400, body: { error: 'bad_request' } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const upstream = await fetchFn(config.apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', [config.authHeader]: authValue(config) },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(request.data) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'gespraechsbriefing', strict: true, schema: BRIEFING_JSON_SCHEMA },
        },
      }),
    });
    if (!upstream.ok) {
      return done(`modell_status_${upstream.status}`, {
        status: 502,
        body: { error: 'upstream_error' },
      });
    }
    const content = extractContent(await upstream.json().catch(() => null));
    let json: unknown = null;
    try {
      json = content === null ? null : JSON.parse(content);
    } catch {
      json = null;
    }
    const parsed = llmBriefingSchema.safeParse(json);
    if (!parsed.success) {
      return done('antwort_ungueltig', { status: 502, body: { error: 'invalid_response' } });
    }
    return done('ok', { status: 200, body: parsed.data });
  } catch {
    const event = controller.signal.aborted ? 'zeitueberschreitung' : 'netzwerkfehler';
    return done(event, { status: 504, body: { error: event } });
  } finally {
    clearTimeout(timer);
  }
}
