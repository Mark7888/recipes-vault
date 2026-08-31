import { Router } from 'express';
import { getMe, patchMe, searchUsers } from '../controllers/users.controller.js';
import { requireSession, requireUser } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireUser);
router.get('/search', searchUsers);
router.get('/me', getMe);
// Changing the account's own username or password stays with the browser
// session: a leaked API key must not be able to lock its owner out.
router.patch('/me', requireSession, patchMe);
export default router;
