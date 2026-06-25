import { Router } from 'express';
import { adminLogin, createInvite, getInvites, createPasswordReset, listUsers } from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();
router.post('/login', adminLogin);
router.use(adminMiddleware);
router.get('/users', listUsers);
router.post('/invites', createInvite);
router.get('/invites', getInvites);
router.post('/password-resets', createPasswordReset);
export default router;
