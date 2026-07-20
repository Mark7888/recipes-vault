import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../api/tags.api';
import { recipeKeys } from './useRecipes';

export function useTags(search: string) {
  return useQuery({
    queryKey: ['tags', search],
    queryFn: () => tagsApi.search(search),
    enabled: search.length > 0,
    staleTime: 30_000,
  });
}

export const allTagsKey = ['tags', 'all'] as const;

export function useAllTags() {
  return useQuery({
    queryKey: allTagsKey,
    queryFn: () => tagsApi.listAll(),
  });
}

function useInvalidateTags() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['tags'] });
    qc.invalidateQueries({ queryKey: recipeKeys.all });
  };
}

export function useRenameTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.rename(id, name),
    onSuccess: invalidate,
  });
}

export function useMergeTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: ({ id, targetId }: { id: string; targetId: string }) => tagsApi.merge(id, targetId),
    onSuccess: invalidate,
  });
}

export function useDeleteTag() {
  const invalidate = useInvalidateTags();
  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: invalidate,
  });
}
