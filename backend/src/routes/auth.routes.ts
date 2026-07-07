import { Router } from 'express';
import { register, login, refresh, logout, resetPassword, checkInvite } from '../controllers/auth.controller.js';

const router = Router();
router.get('/invites/:token', checkInvite);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/reset-password', resetPassword);
export default router;
