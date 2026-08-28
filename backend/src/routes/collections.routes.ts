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
  leaveCollectionHandler,
  addRecipeHandler,
  removeRecipeHandler,
  listIncomingTransfersHandler,
  transferOwnershipHandler,
  cancelTransferHandler,
  acceptTransferHandler,
  rejectTransferHandler,
} from '../controllers/collections.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authMiddleware);
router.get('/', listCollections);
router.post('/', createNewCollection);
router.get('/transfers/incoming', listIncomingTransfersHandler);
router.get('/:id', getCollection);
router.patch('/:id', requireRole(Role.OWNER), renameCollectionHandler);
router.delete('/:id', requireRole(Role.OWNER), deleteCollectionHandler);
router.post('/:id/members', requireRole(Role.OWNER), addMemberHandler);
router.patch('/:id/members/:userId', requireRole(Role.OWNER), updateMemberRoleHandler);
router.delete('/:id/members/:userId', requireRole(Role.OWNER), removeMemberHandler);
// Any member but the Owner can walk away on their own, so this is gated by
// membership alone — leaveCollection rejects the Owner itself.
router.post('/:id/leave', leaveCollectionHandler);
router.post('/:id/transfer', requireRole(Role.OWNER), transferOwnershipHandler);
// No role gate here: by the time this fires the sender may already have
// been demoted (the other party accepted first), and cancelOwnershipTransfer
// authorizes via the transfer's own fromUserId, not current membership role.
router.post('/:id/transfer/cancel', cancelTransferHandler);
router.post('/:id/transfer/accept', acceptTransferHandler);
router.post('/:id/transfer/reject', rejectTransferHandler);
router.post('/:id/recipes', requireRole(Role.OWNER, Role.EDITOR), addRecipeHandler);
router.delete('/:id/recipes/:recipeId', removeRecipeHandler);
export default router;
