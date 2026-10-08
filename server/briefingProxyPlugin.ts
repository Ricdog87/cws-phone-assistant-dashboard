import type { Connect, Plugin } from 'vite';
import { handleBriefingRequest, type LlmConfig } from './briefingHandler';
import { parseJson, readBody, sendJson } from './http';

export const BRIEFING_PATH = '/api/briefing';

function middleware(config: LlmConfig | null): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url?.split('?')[0] !== BRIEFING_PATH) return next();
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
    readBody(req)
      .then(async (raw) => {
        const result = await handleBriefingRequest(parseJson(raw), config);
        sendJson(res, result.status, result.body);
      })
      .catch(() => sendJson(res, 413, { error: 'too_large' }));
  };
}

/**
 * Stellt den Briefing-Proxy im Entwicklungs- und Vorschauserver bereit.
 * Für den Betrieb hinter statischem Hosting wird handleBriefingRequest als
 * Serverless-Funktion unter demselben Pfad bereitgestellt.
 */
export function briefingProxyPlugin(config: LlmConfig | null): Plugin {
  return {
    name: 'briefing-proxy',
    configureServer(server) {
      server.middlewares.use(middleware(config));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(config));
    },
  };
}
