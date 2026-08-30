import { Router } from 'express';
import { register, login, refresh, logout, resetPassword, checkInvite } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/rate-limit.middleware.js';
import { env } from '../config/env.js';

const router = Router();

// Per IP, because there is no account to charge yet. Covers the routes where
// guessing a secret — a password, an invite token, a reset token — is the
// attack.
const guessLimit = authRateLimit(env.AUTH_RATE_LIMIT_PER_MINUTE);

router.get('/invites/:token', guessLimit, checkInvite);
router.post('/register', guessLimit, register);
router.post('/login', guessLimit, login);
// Not rate limited here: the refresh token is an httpOnly cookie, not something
// a client guesses, and a shared IP hitting the wall would log real users out.
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/reset-password', guessLimit, resetPassword);
export default router;
