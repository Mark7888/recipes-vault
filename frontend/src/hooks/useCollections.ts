import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../api/collections.api';
import type { Role } from '../types';

export const collectionKeys = {
  all: ['collections'] as const,
  list: () => ['collections', 'list'] as const,
  detail: (id: string) => ['collections', 'detail', id] as const,
};

export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.list(),
    queryFn: () => collectionsApi.list(),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => collectionsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => collectionsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

export function useRenameCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => collectionsApi.rename(id, name),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: collectionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

export function useAddCollectionMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId, role }: { id: string; userId: string; role: Role }) =>
      collectionsApi.addMember(id, userId, role),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: collectionKeys.detail(id) }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId, role }: { id: string; userId: string; role: Role }) =>
      collectionsApi.updateMemberRole(id, userId, role),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: collectionKeys.detail(id) }),
  });
}

export function useRemoveCollectionMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      collectionsApi.removeMember(id, userId),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: collectionKeys.detail(id) }),
  });
}

export function useAddRecipeToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recipeId }: { id: string; recipeId: string }) =>
      collectionsApi.addRecipe(id, recipeId),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: collectionKeys.detail(id) }),
  });
}

export function useRemoveRecipeFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, recipeId }: { id: string; recipeId: string }) =>
      collectionsApi.removeRecipe(id, recipeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

export function useToggleCollectionMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, userId, isMember, role }: { collectionId: string; userId: string; isMember: boolean; role: Role }) =>
      isMember
        ? collectionsApi.removeMember(collectionId, userId)
        : collectionsApi.addMember(collectionId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => collectionsApi.searchUsers(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });
}
