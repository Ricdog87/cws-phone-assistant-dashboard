import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { handleBriefingRequest, type LlmConfig } from './briefingHandler';

export const BRIEFING_PATH = '/api/briefing';
const MAX_BODY_BYTES = 16 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function middleware(config: LlmConfig | null): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url?.split('?')[0] !== BRIEFING_PATH) return next();
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    readBody(req)
      .then(async (raw) => {
        let body: unknown = null;
        try {
          body = JSON.parse(raw);
        } catch {
          body = null;
        }
        const result = await handleBriefingRequest(body, config);
        send(res, result.status, result.body);
      })
      .catch(() => send(res, 413, { error: 'too_large' }));
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
