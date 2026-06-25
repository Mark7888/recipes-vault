import { Router } from 'express';
import {
  listCollections,
  createNewCollection,
  getCollection,
  renameCollectionHandler,
  deleteCollectionHandler,
  addMemberHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
  addRecipeHandler,
  removeRecipeHandler,
} from '../controllers/collections.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authMiddleware);
router.get('/', listCollections);
router.post('/', createNewCollection);
router.get('/:id', getCollection);
router.patch('/:id', requireRole(Role.OWNER), renameCollectionHandler);
router.delete('/:id', requireRole(Role.OWNER), deleteCollectionHandler);
router.post('/:id/members', requireRole(Role.OWNER), addMemberHandler);
router.patch('/:id/members/:userId', requireRole(Role.OWNER), updateMemberRoleHandler);
router.delete('/:id/members/:userId', requireRole(Role.OWNER), removeMemberHandler);
router.post('/:id/recipes', requireRole(Role.OWNER, Role.EDITOR), addRecipeHandler);
router.delete('/:id/recipes/:recipeId', removeRecipeHandler);
export default router;
