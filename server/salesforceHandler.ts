import { z } from 'zod';

/**
 * Legt Aufgaben (Task) in Salesforce an: Anrufprotokolle und Wiedervorlagen aus dem Cockpit.
 * Anmeldung per OAuth 2.0 Client Credentials an einer Connected App. Zugangsdaten nur aus
 * der Umgebung, nie im Browser, keine Inhalte im Log.
 */
export interface SalesforceConfig {
  /** My-Domain-Adresse, etwa https://firma.my.salesforce.com */
  loginUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  timeoutMs: number;
}

export const DEFAULT_API_VERSION = 'v62.0';
const DEFAULT_TIMEOUT_MS = 10_000;
/** So lange wird ein Zugriffstoken wiederverwendet; bei 401 gibt es sofort ein neues */
const TOKEN_TTL_MS = 15 * 60_000;

function salesforceOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    const salesforce = host.endsWith('.salesforce.com') || host.endsWith('.force.com');
    return url.protocol === 'https:' && salesforce ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Konfiguration aus der Umgebung. Ohne SALESFORCE_SYNC_ENABLED=true bleibt die Übertragung
 * aus, auch wenn Zugangsdaten hinterlegt sind.
 */
export function readSalesforceConfig(
  env: Record<string, string | undefined>,
): SalesforceConfig | null {
  if (env.SALESFORCE_SYNC_ENABLED?.trim() !== 'true') return null;
  const loginUrl = salesforceOrigin(env.SALESFORCE_LOGIN_URL);
  const clientId = env.SALESFORCE_CLIENT_ID?.trim();
  const clientSecret = env.SALESFORCE_CLIENT_SECRET?.trim();
  if (!loginUrl || !clientId || !clientSecret) return null;
  const timeout = Number(env.SALESFORCE_TIMEOUT_MS);
  return {
    loginUrl,
    clientId,
    clientSecret,
    apiVersion: /^v\d+\.\d$/.test(env.SALESFORCE_API_VERSION?.trim() ?? '')
      ? (env.SALESFORCE_API_VERSION?.trim() ?? DEFAULT_API_VERSION)
      : DEFAULT_API_VERSION,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

const salesforceId = z.string().regex(/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/);
/** Aufgaben (Task) beginnen in Salesforce immer mit 00T */
const taskId = z.string().regex(/^00T[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/);

/** Gleicher Aufbau wie SalesforceTaskInput in src/domain/salesforceSync.ts */
export const taskInputSchema = z
  .object({
    kind: z.enum(['callLog', 'recall']),
    subject: z.string().min(1).max(255),
    description: z.string().max(4000),
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['Completed', 'Not Started']),
    callDisposition: z.string().max(255).nullable(),
    reminderAt: z.iso.datetime().nullable(),
    whatId: salesforceId.nullable(),
    whoId: salesforceId.nullable(),
  })
  .strict();

/** Anfrage aus dem Cockpit: die Aufgabe und, falls schon übertragen, ihre ID in Salesforce */
export const syncRequestSchema = z
  .object({
    task: taskInputSchema,
    salesforceId: taskId.nullable(),
  })
  .strict();

export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * Felder der Aufgabe in Salesforce, nur Standardfelder. Die Art (TaskSubtype) lässt sich nur
 * beim Anlegen setzen und fehlt deshalb beim Aktualisieren.
 */
export function taskRecord(
  input: TaskInput,
  mode: 'create' | 'update' = 'create',
): Record<string, string | boolean | null> {
  return {
    Subject: input.subject,
    Description: input.description,
    ActivityDate: input.activityDate,
    Status: input.status,
    Priority: 'Normal',
    ...(mode === 'create' ? { TaskSubtype: input.kind === 'callLog' ? 'Call' : 'Task' } : {}),
    ...(input.callDisposition || mode === 'update'
      ? { CallDisposition: input.callDisposition }
      : {}),
    ...(input.reminderAt
      ? { IsReminderSet: true, ReminderDateTime: input.reminderAt }
      : mode === 'update'
        ? { IsReminderSet: false }
        : {}),
    ...(input.whatId ? { WhatId: input.whatId } : {}),
    ...(input.whoId ? { WhoId: input.whoId } : {}),
  };
}

export interface SalesforceResult {
  status: number;
  body: { id: string } | { error: string };
}

export type LogFn = (entry: { event: string; status: number; ms: number }) => void;

export interface SalesforceDeps {
  fetchFn?: typeof fetch;
  log?: LogFn;
  now?: () => number;
}

const defaultLog: LogFn = ({ event, status, ms }) =>
  console.info(`[salesforce] ${event} status=${status} dauer=${ms}ms`);

interface Token {
  accessToken: string;
  instanceUrl: string;
  expiresAt: number;
}

let cachedToken: Token | null = null;

/** Für Tests: zwischengespeichertes Token verwerfen */
export function resetSalesforceTokenCache(): void {
  cachedToken = null;
}

async function requestToken(
  config: SalesforceConfig,
  fetchFn: typeof fetch,
  signal: AbortSignal,
  now: number,
): Promise<Token | null> {
  const response = await fetchFn(`${config.loginUrl}/services/oauth2/token`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    instance_url?: unknown;
  } | null;
  const instanceUrl = salesforceOrigin(
    typeof payload?.instance_url === 'string' ? payload.instance_url : undefined,
  );
  if (typeof payload?.access_token !== 'string' || !instanceUrl) return null;
  return { accessToken: payload.access_token, instanceUrl, expiresAt: now + TOKEN_TTL_MS };
}

/**
 * Prüft die Anfrage und legt genau eine Aufgabe an oder aktualisiert die schon übertragene.
 * Wurde sie in Salesforce gelöscht, entsteht sie neu. Andere Objekte ändert der Endpunkt nicht.
 */
export async function handleSalesforceRequest(
  body: unknown,
  config: SalesforceConfig | null,
  deps: SalesforceDeps = {},
): Promise<SalesforceResult> {
  const log = deps.log ?? defaultLog;
  const now = deps.now ?? (() => Date.now());
  const fetchFn = deps.fetchFn ?? ((input, init) => fetch(input, init));
  const started = now();
  const done = (event: string, result: SalesforceResult): SalesforceResult => {
    log({ event, status: result.status, ms: now() - started });
    return result;
  };

  if (!config)
    return done('nicht_konfiguriert', { status: 503, body: { error: 'not_configured' } });

  const request = syncRequestSchema.safeParse(body);
  if (!request.success)
    return done('anfrage_ungueltig', { status: 400, body: { error: 'bad_request' } });
  const { task, salesforceId: existingId } = request.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  /** Ruft die Task-Schnittstelle auf; bei abgelaufenem Token einmal neu anmelden. null ohne Anmeldung */
  const send = async (method: 'POST' | 'PATCH', path: string, record: object) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!cachedToken || cachedToken.expiresAt <= now()) {
        cachedToken = await requestToken(config, fetchFn, controller.signal, now());
      }
      if (!cachedToken) return null;
      const response = await fetchFn(
        `${cachedToken.instanceUrl}/services/data/${config.apiVersion}/sobjects/Task${path}`,
        {
          method,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${cachedToken.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        },
      );
      if (response.status === 401 && attempt === 0) {
        cachedToken = null;
        continue;
      }
      return response;
    }
    return null;
  };
  const authFailed = () =>
    done('anmeldung_fehlgeschlagen', { status: 502, body: { error: 'auth_failed' } });
  const upstream = (status: number) =>
    done(`salesforce_status_${status}`, { status: 502, body: { error: 'upstream_error' } });

  try {
    if (existingId) {
      const updated = await send('PATCH', `/${existingId}`, taskRecord(task, 'update'));
      if (!updated) return authFailed();
      if (updated.ok) return done('aktualisiert', { status: 200, body: { id: existingId } });
      if (updated.status !== 404) return upstream(updated.status);
      // In Salesforce gelöscht: neu anlegen
    }
    const response = await send('POST', '', taskRecord(task, 'create'));
    if (!response) return authFailed();
    if (!response.ok) return upstream(response.status);
    const created = (await response.json().catch(() => null)) as { id?: unknown } | null;
    if (typeof created?.id !== 'string') {
      return done('antwort_ungueltig', { status: 502, body: { error: 'invalid_response' } });
    }
    return done('angelegt', { status: 201, body: { id: created.id } });
  } catch {
    const event = controller.signal.aborted ? 'zeitueberschreitung' : 'netzwerkfehler';
    return done(event, { status: 504, body: { error: event } });
  } finally {
    clearTimeout(timer);
  }
}
