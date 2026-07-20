import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

export async function createCollection(name: string, ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({ data: { name } });
    await tx.collectionMembership.create({
      data: { collectionId: collection.id, userId: ownerId, role: Role.OWNER },
    });
    return collection;
  });
}

const TRANSFER_INCLUDE = {
  fromUser: { select: { id: true, username: true } },
  toUser: { select: { id: true, username: true } },
} as const;

export async function getCollectionsForUser(userId: string) {
  return prisma.collection.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { recipes: true } },
      pendingTransfer: { include: TRANSFER_INCLUDE },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCollectionById(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      recipes: {
        include: {
          recipe: { include: { tags: true, coverImage: true, owner: { select: { id: true, username: true } } } },
          addedBy: { select: { id: true, username: true } },
        },
      },
      pendingTransfer: { include: TRANSFER_INCLUDE },
    },
  });
}

export async function getCollectionIdsContainingRecipe(
  userId: string,
  recipeId: string,
): Promise<{ collectionId: string; addedById: string }[]> {
  return prisma.recipeCollection.findMany({
    where: { recipeId, collection: { members: { some: { userId } } } },
    select: { collectionId: true, addedById: true },
  });
}

export async function getUserRoleInCollection(collectionId: string, userId: string): Promise<Role | null> {
  const membership = await prisma.collectionMembership.findUnique({
    where: { collectionId_userId: { collectionId, userId } },
  });
  return membership?.role ?? null;
}

export async function renameCollection(id: string, name: string) {
  return prisma.collection.update({ where: { id }, data: { name } });
}

export async function deleteCollection(id: string) {
  return prisma.collection.delete({ where: { id } });
}

export async function addMember(collectionId: string, userId: string, role: Role) {
  return prisma.collectionMembership.create({ data: { collectionId, userId, role } });
}

export async function updateMemberRole(collectionId: string, userId: string, newRole: Role) {
  if (newRole === Role.OWNER) {
    // Ownership changes hands only through the transfer accept/reject flow,
    // never as a direct role assignment.
    throw new Error('Use the ownership transfer flow to grant OWNER');
  }
  return prisma.collectionMembership.update({
    where: { collectionId_userId: { collectionId, userId } },
    data: { role: newRole },
  });
}

export async function removeMember(collectionId: string, userId: string) {
  return prisma.collectionMembership.delete({
    where: { collectionId_userId: { collectionId, userId } },
  });
}

export async function initiateOwnershipTransfer(collectionId: string, fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) throw new Error('Cannot transfer ownership to yourself');
  const toMembership = await prisma.collectionMembership.findUnique({
    where: { collectionId_userId: { collectionId, userId: toUserId } },
  });
  if (!toMembership) throw new Error('Target user is not a member of this collection');
  const existing = await prisma.ownershipTransfer.findUnique({ where: { collectionId } });
  if (existing) throw new Error('A transfer is already pending for this collection');
  return prisma.ownershipTransfer.create({
    data: { collectionId, fromUserId, toUserId },
    include: TRANSFER_INCLUDE,
  });
}

// The other party (or the same party from another tab) may already have
// resolved the transfer by the time this fires — since the desired end
// state ("no pending transfer") already holds, treat that as success
// rather than an error.
export async function cancelOwnershipTransfer(collectionId: string, requesterId: string) {
  const transfer = await prisma.ownershipTransfer.findUnique({ where: { collectionId } });
  if (!transfer) return;
  if (transfer.fromUserId !== requesterId) throw new Error('Only the sender can cancel this transfer');
  await prisma.ownershipTransfer.delete({ where: { collectionId } });
}

export async function rejectOwnershipTransfer(collectionId: string, requesterId: string) {
  const transfer = await prisma.ownershipTransfer.findUnique({ where: { collectionId } });
  if (!transfer) return;
  if (transfer.toUserId !== requesterId) throw new Error('Only the recipient can reject this transfer');
  await prisma.ownershipTransfer.delete({ where: { collectionId } });
}

export async function acceptOwnershipTransfer(collectionId: string, requesterId: string) {
  const transfer = await prisma.ownershipTransfer.findUnique({ where: { collectionId } });
  if (!transfer) return;
  if (transfer.toUserId !== requesterId) throw new Error('Only the recipient can accept this transfer');
  return prisma.$transaction(async (tx) => {
    await tx.collectionMembership.update({
      where: { collectionId_userId: { collectionId, userId: transfer.fromUserId } },
      data: { role: Role.EDITOR },
    });
    await tx.collectionMembership.update({
      where: { collectionId_userId: { collectionId, userId: transfer.toUserId } },
      data: { role: Role.OWNER },
    });
    await tx.ownershipTransfer.delete({ where: { collectionId } });
  });
}

export async function getIncomingTransfersForUser(userId: string) {
  return prisma.ownershipTransfer.findMany({
    where: { toUserId: userId },
    include: {
      ...TRANSFER_INCLUDE,
      collection: { include: { _count: { select: { recipes: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addRecipeToCollection(collectionId: string, recipeId: string, addedById: string) {
  return prisma.recipeCollection.create({ data: { collectionId, recipeId, addedById } });
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string, requesterId: string, requesterRole: Role) {
  const entry = await prisma.recipeCollection.findUnique({
    where: { recipeId_collectionId: { recipeId, collectionId } },
  });
  if (!entry) throw new Error('Recipe not in collection');
  if (requesterRole !== Role.OWNER && entry.addedById !== requesterId) {
    throw new Error('You can only remove recipes you added');
  }
  return prisma.recipeCollection.delete({ where: { id: entry.id } });
}
