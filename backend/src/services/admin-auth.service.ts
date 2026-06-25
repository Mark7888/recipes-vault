import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let adminPasswordHash: string | null = null;

export async function initAdminAuth(): Promise<void> {
  adminPasswordHash = await argon2.hash(env.ADMIN_PASSWORD);
  logger.info('Admin auth initialized');
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  if (username !== env.ADMIN_USERNAME) return false;
  if (!adminPasswordHash) return false;
  return argon2.verify(adminPasswordHash, password);
}

export function signAdminToken(): string {
  return jwt.sign({ scope: 'admin' }, env.JWT_SECRET, { expiresIn: '15m' });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { scope?: string };
    return payload.scope === 'admin';
  } catch {
    return false;
  }
}
