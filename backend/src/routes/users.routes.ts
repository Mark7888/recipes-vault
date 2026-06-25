import { Router } from 'express';
import { patchMe, searchUsers } from '../controllers/users.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);
router.get('/search', searchUsers);
router.patch('/me', patchMe);
export default router;
