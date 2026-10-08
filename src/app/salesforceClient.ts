import type { SalesforceTaskInput, SyncStatus } from '@/domain/salesforceSync';

/** Serverfunktion, die Aufgaben in Salesforce anlegt; Zugangsdaten liegen nur dort */
export const SALESFORCE_SYNC_ENDPOINT = '/api/salesforce';

export interface SendResult {
  status: Extract<SyncStatus, 'synced' | 'failed' | 'notConnected'>;
  salesforceId: string | null;
}

export type TaskSender = (task: SalesforceTaskInput) => Promise<SendResult>;

/** Legt eine Aufgabe über die Serverfunktion an. Ohne Freischaltung antwortet sie mit 503. */
export const postTask: TaskSender = async (task) => {
  try {
    const response = await fetch(SALESFORCE_SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
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
