import { Router } from 'express';
import { authRateLimiter } from '../middleware/rate-limit.middleware.js';
import { register, login, refresh, logout, resetPassword, checkInvite } from '../controllers/auth.controller.js';

const router = Router();
router.get('/invites/:token', checkInvite);
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/reset-password', authRateLimiter, resetPassword);
export default router;
