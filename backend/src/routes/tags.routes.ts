import { Router } from 'express';
import { listTags } from '../controllers/tags.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);
router.get('/', listTags);
export default router;
