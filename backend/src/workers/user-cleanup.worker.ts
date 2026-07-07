import { processPendingDeletions } from '../services/user-deletion.service.js';
import { logger } from '../lib/logger.js';

const CLEANUP_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Small in-process queue: users marked PENDING_DELETION are picked up here,
 * off the request path. Runs every minute and can be kicked to run sooner
 * right after an admin deletes a user.
 */
export function startUserCleanupWorker(): void {
  if (timer) return;
  timer = setInterval(() => void runCleanup(), CLEANUP_INTERVAL_MS);
  timer.unref(); // don't keep the process alive just for the worker
  void runCleanup(); // catch anything left over from a previous run
}

export function stopUserCleanupWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Schedule a cleanup pass as soon as possible, without awaiting it. */
export function kickUserCleanup(): void {
  setImmediate(() => void runCleanup());
}

async function runCleanup(): Promise<void> {
  if (running) return; // a kicked pass may overlap the interval; never run twice at once
  running = true;
  try {
    await processPendingDeletions();
  } catch (err) {
    logger.error({ err }, 'User cleanup pass failed');
  } finally {
    running = false;
  }
}
