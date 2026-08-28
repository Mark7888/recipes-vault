import { prisma } from '../lib/prisma.js';
import { Prisma, Role } from '@prisma/client';

/**
 * The title a user's own recipe book goes by. Derived from the username on
 * every read rather than kept in the row, so it follows a rename and there is
 * nothing to keep in sync.
 */
export function defaultCollectionName(username: string): string {
  return `${username}'s Recipe Book`;
}

const OWNER_SELECT = { id: true, username: true } as const;

/**
 * A user's recipe book, created on first sight. Every user has exactly one
 * (defaultForUserId is unique), so a concurrent caller losing the race is not
 * an error — its book is as good as this one's.
 */
export async function ensureDefaultCollection(userId: string, db: Prisma.TransactionClient = prisma) {
  const existing = await db.collection.findUnique({ where: { defaultForUserId: userId } });
  if (existing) return existing;
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (!user) throw new Error('User not found');
  try {
    return await db.collection.create({
      data: {
        name: defaultCollectionName(user.username),
        isDefault: true,
        defaultForUserId: userId,
        members: { create: { userId, role: Role.OWNER } },
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code !== 'P2002') throw err;
    return db.collection.findUniqueOrThrow({ where: { defaultForUserId: userId } });
  }
}

/**
 * Guard for everything a recipe book does not do. Its contents follow whatever
 * its owner owns, its name follows their username, and it lives and dies with
 * them — so there is nothing here to rename, delete, hand over, or put a recipe
 * into by hand. Routes reach these through the services rather than a route
 * guard, so nothing can slip past by calling the service directly.
 */
async function assertNotDefaultCollection(collectionId: string, message: string): Promise<void> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { isDefault: true },
  });
  if (collection?.isDefault) throw new Error(message);
}

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
  await ensureDefaultCollection(userId);
  const collections = await prisma.collection.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: OWNER_SELECT } } },
      defaultForUser: { select: OWNER_SELECT },
      _count: { select: { recipes: true } },
      pendingTransfer: { include: TRANSFER_INCLUDE },
    },
    orderBy: { createdAt: 'desc' },
  });

  // A book holds no RecipeCollection rows, so the join-table count it comes
  // back with is always 0 — it holds whatever its owner owns instead.
  const bookOwnerIds = collections.flatMap((c) => (c.defaultForUser ? [c.defaultForUser.id] : []));
  if (bookOwnerIds.length === 0) return collections;
  const counts = await prisma.recipe.groupBy({
    by: ['ownerId'],
    where: { ownerId: { in: bookOwnerIds } },
    _count: { _all: true },
  });
  const countByOwner = new Map(counts.map((c) => [c.ownerId, c._count._all]));
  return collections.map((c) =>
    c.defaultForUser
      ? {
          ...c,
          name: defaultCollectionName(c.defaultForUser.username),
          _count: { recipes: countByOwner.get(c.defaultForUser.id) ?? 0 },
        }
      : c,
  );
}

export async function getCollectionById(id: string) {
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: OWNER_SELECT } } },
      defaultForUser: { select: OWNER_SELECT },
      recipes: {
        include: {
          recipe: { include: { tags: true, coverImage: true, owner: { select: OWNER_SELECT } } },
          addedBy: { select: OWNER_SELECT },
        },
      },
      pendingTransfer: { include: TRANSFER_INCLUDE },
    },
  });
  if (!collection?.defaultForUser) return collection;

  // Nothing was ever put in a book, so there are no rows to read back: its
  // contents are its owner's library, dressed in the same shape the ordinary
  // collections come back in and all "added by" the owner.
  const owner = collection.defaultForUser;
  const recipes = await prisma.recipe.findMany({
    where: { ownerId: owner.id },
    include: { tags: true, coverImage: true, owner: { select: OWNER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    ...collection,
    name: defaultCollectionName(owner.username),
    recipes: recipes.map((recipe) => ({
      id: `default:${recipe.id}`,
      recipeId: recipe.id,
      collectionId: collection.id,
      addedById: owner.id,
      addedBy: owner,
      recipe,
    })),
  };
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
  await assertNotDefaultCollection(id, 'A recipe book is named after its owner and cannot be renamed');
  return prisma.collection.update({ where: { id }, data: { name } });
}

export async function deleteCollection(id: string) {
  await assertNotDefaultCollection(id, 'A recipe book cannot be deleted');
  return prisma.collection.delete({ where: { id } });
}

export async function addMember(collectionId: string, userId: string, role: Role) {
  if (role !== Role.VIEWER) {
    await assertNotDefaultCollection(collectionId, 'A recipe book can only be shared with Viewers');
  }
  return prisma.collectionMembership.create({ data: { collectionId, userId, role } });
}

export async function updateMemberRole(collectionId: string, userId: string, newRole: Role) {
  await assertNotDefaultCollection(collectionId, 'Everyone a recipe book is shared with is a Viewer');
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

/**
 * Give up your own membership. Anyone but the Owner can walk away from a
 * collection they were added to — the Owner hands it over or deletes it
 * instead, and a recipe book's owner can do neither.
 */
export async function leaveCollection(collectionId: string, userId: string) {
  const membership = await prisma.collectionMembership.findUnique({
    where: { collectionId_userId: { collectionId, userId } },
  });
  if (!membership) throw new Error('You are not a member of this collection');
  if (membership.role === Role.OWNER) throw new Error('The Owner cannot leave a collection');
  await prisma.collectionMembership.delete({ where: { id: membership.id } });
}

export async function initiateOwnershipTransfer(collectionId: string, fromUserId: string, toUserId: string) {
  await assertNotDefaultCollection(collectionId, 'A recipe book stays with its owner and cannot be transferred');
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

const BOOK_MEMBERSHIP_IS_AUTOMATIC =
  'A recipe book holds everything its owner owns — recipes cannot be added to or removed from it by hand';

export async function addRecipeToCollection(collectionId: string, recipeId: string, addedById: string) {
  await assertNotDefaultCollection(collectionId, BOOK_MEMBERSHIP_IS_AUTOMATIC);
  return prisma.recipeCollection.create({ data: { collectionId, recipeId, addedById } });
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string, requesterId: string, requesterRole: Role) {
  await assertNotDefaultCollection(collectionId, BOOK_MEMBERSHIP_IS_AUTOMATIC);
  const entry = await prisma.recipeCollection.findUnique({
    where: { recipeId_collectionId: { recipeId, collectionId } },
  });
  if (!entry) throw new Error('Recipe not in collection');
  if (requesterRole !== Role.OWNER && entry.addedById !== requesterId) {
    throw new Error('You can only remove recipes you added');
  }
  return prisma.recipeCollection.delete({ where: { id: entry.id } });
}
