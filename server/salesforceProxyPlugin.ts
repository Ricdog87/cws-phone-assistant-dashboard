import type { Connect, Plugin } from 'vite';
import { parseJson, readBody, sendJson } from './http';
import { handleSalesforceRequest, type SalesforceConfig } from './salesforceHandler';

export const SALESFORCE_PATH = '/api/salesforce';

function middleware(config: SalesforceConfig | null): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url?.split('?')[0] !== SALESFORCE_PATH) return next();
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    readBody(req)
      .then(async (raw) => {
        const result = await handleSalesforceRequest(parseJson(raw), config);
        sendJson(res, result.status, result.body);
      })
      .catch(() => sendJson(res, 413, { error: 'too_large' }));
  };
}

/** Salesforce-Übertragung im Entwicklungs- und Vorschauserver, wie api/salesforce.ts */
export function salesforceProxyPlugin(config: SalesforceConfig | null): Plugin {
  return {
    name: 'salesforce-proxy',
    configureServer(server) {
      server.middlewares.use(middleware(config));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(config));
    },
  };
}
