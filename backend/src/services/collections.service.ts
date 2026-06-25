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

export async function getCollectionsForUser(userId: string) {
  return prisma.collection.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { recipes: true } },
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
    return prisma.$transaction(async (tx) => {
      // Demote current owner to Editor
      await tx.collectionMembership.updateMany({
        where: { collectionId, role: Role.OWNER },
        data: { role: Role.EDITOR },
      });
      // Promote new owner
      return tx.collectionMembership.update({
        where: { collectionId_userId: { collectionId, userId } },
        data: { role: Role.OWNER },
      });
    });
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
