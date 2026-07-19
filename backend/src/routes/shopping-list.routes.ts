import { Router } from 'express';
import {
  listItems,
  postItem,
  postItemsBulk,
  patchItem,
  removeItem,
  postBought,
  postClear,
  listHistory,
  postReaddHistory,
  removeHistory,
} from '../controllers/shopping-list.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);
router.get('/', listItems);
router.post('/items', postItem);
router.post('/items/bulk', postItemsBulk);
router.patch('/items/:id', patchItem);
router.delete('/items/:id', removeItem);
router.post('/bought', postBought);
router.post('/clear', postClear);
router.get('/history', listHistory);
router.post('/history/:id/readd', postReaddHistory);
router.delete('/history/:id', removeHistory);
export default router;
