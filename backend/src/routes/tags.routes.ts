import { Router } from 'express';
import {
  listTags,
  listAllTagsHandler,
  renameTagHandler,
  mergeTagHandler,
  deleteTagHandler,
} from '../controllers/tags.controller.js';
import { requireUser } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireUser);
router.get('/', listTags);
router.get('/all', listAllTagsHandler);
router.patch('/:id', renameTagHandler);
router.post('/:id/merge', mergeTagHandler);
router.delete('/:id', deleteTagHandler);
export default router;
