import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { deleteImageFile } from './image-storage.service.js';
import { logger } from '../lib/logger.js';

/**
 * User deletion is a two-phase process so admin requests stay fast:
 *
 * 1. `markUserForDeletion` flips the user to PENDING_DELETION. From that
 *    moment auth rejects them (login, refresh and access-token checks all
 *    require ACTIVE), so no new content can appear under their account.
 * 2. The cleanup worker calls `processPendingDeletions`, which removes the
 *    user's content while preserving what others depend on:
 *      - collections shared with other members survive (ownership is handed
 *        to another member if needed); solo collections are deleted
 *      - recipes that are in at least one collection survive; the rest are
 *        deleted along with their image files
 *    Every step is idempotent, so a crash mid-cleanup is repaired on the
 *    next worker tick.
 */

export async function markUserForDeletion(userId: string): Promise<boolean> {
  // Conditional update: only an ACTIVE user can be marked, so concurrent
  // delete requests (or a delete racing the cleanup worker) are harmless.
  const { count } = await prisma.user.updateMany({
    where: { id: userId, status: UserStatus.ACTIVE },
    data: { status: UserStatus.PENDING_DELETION, deletedAt: new Date() },
  });
  return count === 1;
}

export async function processPendingDeletions(): Promise<void> {
  // DELETED tombstones are re-swept too: cleanup is idempotent, and a
  // tombstone's kept recipes can later fall out of every collection (e.g.
  // when a shared collection's last member is deleted). Re-sweeping removes
  // those recipes and drops the tombstone once nothing references it.
  const pending = await prisma.user.findMany({
    where: { status: { in: [UserStatus.PENDING_DELETION, UserStatus.DELETED] } },
    select: { id: true, status: true },
  });
  for (const user of pending) {
    try {
      await cleanUpDeletedUser(user.id);
      if (user.status === UserStatus.PENDING_DELETION) {
        logger.info({ userId: user.id }, 'Deleted user cleaned up');
      }
    } catch (err) {
      // Leave the user as-is; the next tick retries.
      logger.error({ err, userId: user.id }, 'User cleanup failed, will retry');
    }
  }
}

async function cleanUpDeletedUser(userId: string): Promise<void> {
  await detachFromCollections(userId);
  await deleteOrphanRecipes(userId);
  await finalizeUser(userId);
}

/**
 * Remove the user from every collection. Collections with other members are
 * kept (promoting someone to OWNER if the deleted user owned it); collections
 * where they were the sole member are deleted, cascading their memberships
 * and recipe links.
 */
async function detachFromCollections(userId: string): Promise<void> {
  const memberships = await prisma.collectionMembership.findMany({
    where: { userId },
    select: { collectionId: true, role: true },
  });

  for (const membership of memberships) {
    // One transaction per collection: member counts and the ownership
    // handover are decided on rows locked inside the same transaction, so a
    // concurrent member add/remove can't leave the collection ownerless.
    await prisma.$transaction(async (tx) => {
      const others = await tx.collectionMembership.findMany({
        where: { collectionId: membership.collectionId, userId: { not: userId } },
        orderBy: { role: 'asc' }, // Role enum order: OWNER, EDITOR, VIEWER
      });

      if (others.length === 0) {
        await tx.collection.delete({ where: { id: membership.collectionId } });
        return;
      }

      if (membership.role === Role.OWNER && !others.some(m => m.role === Role.OWNER)) {
        await tx.collectionMembership.update({
          where: { id: others[0].id },
          data: { role: Role.OWNER },
        });
      }

      await tx.collectionMembership.deleteMany({
        where: { collectionId: membership.collectionId, userId },
      });
    });
  }
}

/**
 * Delete the user's recipes that are not part of any collection. Each delete
 * re-checks the "not in a collection" condition atomically, so a recipe that
 * gets added to a collection between listing and deleting is spared — and its
 * image files are only unlinked when the row was actually deleted.
 */
async function deleteOrphanRecipes(userId: string): Promise<void> {
  const orphans = await prisma.recipe.findMany({
    where: { ownerId: userId, collections: { none: {} } },
    select: { id: true, images: { select: { filePath: true } } },
  });

  for (const recipe of orphans) {
    const { count } = await prisma.recipe.deleteMany({
      where: { id: recipe.id, collections: { none: {} } },
    });
    if (count === 1) {
      for (const image of recipe.images) {
        await deleteImageFile(image.filePath);
      }
    }
  }
}

/**
 * Remove the user row entirely if nothing references it anymore; otherwise
 * keep it as an anonymized tombstone so surviving recipes and collection
 * entries keep a valid owner/addedBy reference.
 */
async function finalizeUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetLink.deleteMany({ where: { userId } });
    await tx.shoppingListItem.deleteMany({ where: { userId } });
    await tx.shoppingHistoryEntry.deleteMany({ where: { userId } });

    const remaining = await tx.user.findUnique({
      where: { id: userId },
      select: { _count: { select: { recipes: true, addedToCollections: true, memberships: true } } },
    });
    if (!remaining) return; // already finalized on a previous run

    const { recipes, addedToCollections, memberships } = remaining._count;
    if (recipes === 0 && addedToCollections === 0 && memberships === 0) {
      await tx.user.delete({ where: { id: userId } });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          username: `deleted_${userId.slice(0, 8)}`,
          passwordHash: '',
          status: UserStatus.DELETED,
        },
      });
    }
  });
}
