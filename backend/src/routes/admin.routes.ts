import { Router } from 'express';
import { adminLogin, createInvite, getInvites, revokeInvite, createPasswordReset, listUsers, deleteUser } from '../controllers/admin.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();
router.post('/login', adminLogin);
router.use(adminMiddleware);
router.get('/users', listUsers);
router.delete('/users/:id', deleteUser);
router.post('/invites', createInvite);
router.get('/invites', getInvites);
router.delete('/invites/:id', revokeInvite);
router.post('/password-resets', createPasswordReset);
export default router;
