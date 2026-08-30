import type { Request, Response } from 'express';
import {
  createCollection,
  getCollectionsForUser,
  getCollectionById,
  renameCollection,
  deleteCollection,
  addMember,
  updateMemberRole,
  removeMember,
  leaveCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  getUserRoleInCollection,
  initiateOwnershipTransfer,
  cancelOwnershipTransfer,
  acceptOwnershipTransfer,
  rejectOwnershipTransfer,
  getIncomingTransfersForUser,
} from '../services/collections.service.js';
import {
  addCollectionRecipeSchema,
  addMemberSchema,
  createCollectionSchema,
  renameCollectionSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
} from '../schemas/collections.schema.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function listCollections(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const collections = await getCollectionsForUser(userId);
  res.json(collections);
}

export async function createNewCollection(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { name } = createCollectionSchema.parse(req.body);
    const collection = await createCollection(name, userId);
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function getCollection(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const role = await getUserRoleInCollection(id, userId);
  if (!role) { res.status(403).json({ error: 'Forbidden' }); return; }
  const collection = await getCollectionById(id);
  if (!collection) { res.status(404).json({ error: 'Collection not found' }); return; }
  res.json(collection);
}

export async function renameCollectionHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const { name } = renameCollectionSchema.parse(req.body);
    const collection = await renameCollection(id, name);
    res.json(collection);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function deleteCollectionHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    await deleteCollection(id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function addMemberHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const { userId, role } = addMemberSchema.parse(req.body);
    const membership = await addMember(id, userId, role);
    res.status(201).json(membership);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function updateMemberRoleHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  try {
    const { role } = updateMemberRoleSchema.parse(req.body);
    const membership = await updateMemberRole(id, userId, role);
    res.json(membership);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function removeMemberHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.params.userId as string;
  try {
    await removeMember(id, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function leaveCollectionHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    await leaveCollection(id, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function listIncomingTransfersHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const transfers = await getIncomingTransfersForUser(userId);
  res.json(transfers);
}

export async function transferOwnershipHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    const { toUserId } = transferOwnershipSchema.parse(req.body);
    const transfer = await initiateOwnershipTransfer(id, userId, toUserId);
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function cancelTransferHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    await cancelOwnershipTransfer(id, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function acceptTransferHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    await acceptOwnershipTransfer(id, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function rejectTransferHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    await rejectOwnershipTransfer(id, userId);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function addRecipeHandler(req: Request, res: Response): Promise<void> {
  const addedById = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    const { recipeId } = addCollectionRecipeSchema.parse(req.body);
    const entry = await addRecipeToCollection(id, recipeId, addedById);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function removeRecipeHandler(req: Request, res: Response): Promise<void> {
  const requesterId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipeId = req.params.recipeId as string;
  const requesterRole = await getUserRoleInCollection(id, requesterId);
  if (!requesterRole) { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    await removeRecipeFromCollection(id, recipeId, requesterId, requesterRole);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
