import { createRequire } from 'node:module';
import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

const require = createRequire(import.meta.url);
// pino-http uses CJS export= which isn't callable via ESM default import in NodeNext mode
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinoHttp = require('pino-http') as (opts?: Record<string, unknown>) => RequestHandler;

export const requestLogger: RequestHandler = pinoHttp({ logger });
