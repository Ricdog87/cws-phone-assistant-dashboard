import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleSalesforceRequest,
  readSalesforceConfig,
  resetSalesforceTokenCache,
  type SalesforceConfig,
} from '../server/salesforceHandler';

const CONFIG: SalesforceConfig = {
  loginUrl: 'https://beispiel.my.salesforce.com',
  clientId: 'id',
  clientSecret: 'secret',
  apiVersion: 'v62.0',
  timeoutMs: 1000,
};

const TASK = {
  kind: 'recall',
  subject: 'Wiedervorlage: Bau Fehn',
  description: 'Grund: Rückruf vereinbart',
  activityDate: '2026-10-12',
  status: 'Not Started',
  callDisposition: null,
  reminderAt: '2026-10-12T12:00:00.000Z',
  whatId: null,
  whoId: '00Q000000000001AAA',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const silent = { log: () => undefined };

describe('readSalesforceConfig', () => {
  it('bleibt ohne ausdrückliche Freischaltung aus', () => {
    const env = {
      SALESFORCE_LOGIN_URL: 'https://beispiel.my.salesforce.com',
      SALESFORCE_CLIENT_ID: 'id',
      SALESFORCE_CLIENT_SECRET: 'secret',
    };
    expect(readSalesforceConfig(env)).toBeNull();
    expect(readSalesforceConfig({ ...env, SALESFORCE_SYNC_ENABLED: 'true' })).toMatchObject({
      loginUrl: 'https://beispiel.my.salesforce.com',
      apiVersion: 'v62.0',
    });
    // Nur https-Adressen von Salesforce
    expect(
      readSalesforceConfig({
        ...env,
        SALESFORCE_SYNC_ENABLED: 'true',
        SALESFORCE_LOGIN_URL: 'https://example.org',
      }),
    ).toBeNull();
  });
});

describe('handleSalesforceRequest', () => {
  beforeEach(() => resetSalesforceTokenCache());

  it('antwortet ohne Konfiguration mit 503 und ohne Netzwerkzugriff', async () => {
    const fetchFn = vi.fn();
    const result = await handleSalesforceRequest(TASK, null, { ...silent, fetchFn });
    expect(result).toEqual({ status: 503, body: { error: 'not_configured' } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('weist unbekannte Felder und ungültige IDs ab', async () => {
    const fetchFn = vi.fn();
    for (const body of [{ ...TASK, OwnerId: 'x' }, { ...TASK, whoId: 'DEMO-1' }, null]) {
      const result = await handleSalesforceRequest(body, CONFIG, { ...silent, fetchFn });
      expect(result.status).toBe(400);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('meldet sich per Client Credentials an und legt genau eine Aufgabe an', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { access_token: 'token', instance_url: 'https://beispiel.my.salesforce.com' }),
      )
      .mockResolvedValueOnce(json(201, { id: '00T000000000001AAA', success: true }));
    const log = vi.fn();
    const result = await handleSalesforceRequest(TASK, CONFIG, { fetchFn, log });
    expect(result).toEqual({ status: 201, body: { id: '00T000000000001AAA' } });

    const [tokenUrl, tokenInit] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(tokenUrl).toBe('https://beispiel.my.salesforce.com/services/oauth2/token');
    expect(String(tokenInit.body)).toContain('grant_type=client_credentials');

    const [taskUrl, taskInit] = fetchFn.mock.calls[1] as [string, RequestInit];
    expect(taskUrl).toBe('https://beispiel.my.salesforce.com/services/data/v62.0/sobjects/Task');
    expect(JSON.parse(String(taskInit.body))).toEqual({
      Subject: 'Wiedervorlage: Bau Fehn',
      Description: 'Grund: Rückruf vereinbart',
      ActivityDate: '2026-10-12',
      Status: 'Not Started',
      Priority: 'Normal',
      TaskSubtype: 'Task',
      IsReminderSet: true,
      ReminderDateTime: '2026-10-12T12:00:00.000Z',
      WhoId: '00Q000000000001AAA',
    });
    // Protokoll ohne Inhalte
    expect(JSON.stringify(log.mock.calls)).not.toContain('Bau Fehn');
  });

  it('meldet sich bei abgelaufenem Token einmal neu an', async () => {
    const token = () =>
      json(200, { access_token: 'token', instance_url: 'https://beispiel.my.salesforce.com' });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json(401, [{ errorCode: 'INVALID_SESSION_ID' }]))
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(json(201, { id: '00T000000000002AAA' }));
    const result = await handleSalesforceRequest(TASK, CONFIG, { ...silent, fetchFn });
    expect(result.status).toBe(201);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('gibt Fehler von Salesforce als 502 weiter', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        json(200, { access_token: 'token', instance_url: 'https://beispiel.my.salesforce.com' }),
      )
      .mockResolvedValueOnce(json(400, [{ errorCode: 'REQUIRED_FIELD_MISSING' }]));
    const result = await handleSalesforceRequest(TASK, CONFIG, { ...silent, fetchFn });
    expect(result).toEqual({ status: 502, body: { error: 'upstream_error' } });
  });
});
