import { Router } from 'express';
import { adminLogin, createInvite, getInvites, revokeInvite, createPasswordReset, getPasswordResets, revokePasswordReset, listUsers, deleteUser } from '../controllers/admin.controller.js';
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
router.get('/password-resets', getPasswordResets);
router.delete('/password-resets/:id', revokePasswordReset);
export default router;
