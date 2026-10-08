import type { SalesforceTaskInput, SyncStatus } from '@/domain/salesforceSync';

/** Serverfunktion, die Aufgaben in Salesforce anlegt und aktualisiert; Zugangsdaten liegen nur dort */
export const SALESFORCE_SYNC_ENDPOINT = '/api/salesforce';

export interface SendResult {
  status: Extract<SyncStatus, 'synced' | 'failed' | 'notConnected'>;
  salesforceId: string | null;
}

/** salesforceId der schon übertragenen Aufgabe: dann wird sie aktualisiert statt neu angelegt */
export type TaskSender = (
  task: SalesforceTaskInput,
  salesforceId: string | null,
) => Promise<SendResult>;

/** Überträgt eine Aufgabe über die Serverfunktion. Ohne Freischaltung antwortet sie mit 503. */
export const postTask: TaskSender = async (task, salesforceId) => {
  try {
    const response = await fetch(SALESFORCE_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, salesforceId }),
    });
    if (response.status === 503 || response.status === 404) {
      return { status: 'notConnected', salesforceId: null };
    }
    if (!response.ok) return { status: 'failed', salesforceId: null };
    const body = (await response.json()) as { id?: unknown };
    return { status: 'synced', salesforceId: typeof body.id === 'string' ? body.id : null };
  } catch {
    return { status: 'failed', salesforceId: null };
  }
};
