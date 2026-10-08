import { handleSalesforceRequest, readSalesforceConfig } from '../server/salesforceHandler.js';

/**
 * Serverless-Funktion für Vercel: legt Anrufprotokolle und Wiedervorlagen als Aufgabe in
 * Salesforce an. Ohne SALESFORCE_SYNC_ENABLED=true und Zugangsdaten antwortet sie mit 503.
 */
export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > 16 * 1024) {
    return Response.json({ error: 'too_large' }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const result = await handleSalesforceRequest(body, readSalesforceConfig(process.env));
  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
