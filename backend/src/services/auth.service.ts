import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, scope: 'user' }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, scope: 'refresh' }, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; scope: string };
  if (payload.scope !== 'user') throw new Error('Invalid token scope');
  return payload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; scope: string };
  if (payload.scope !== 'refresh') throw new Error('Invalid token scope');
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

const passwordSchema = {
  minLength: 8,
  validate(password: string): string | null {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
  },
};

export { passwordSchema };
