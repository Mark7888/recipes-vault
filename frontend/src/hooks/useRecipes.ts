import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes.api';
import { collectionsApi } from '../api/collections.api';
import { collectionKeys } from './useCollections';
import type { Recipe } from '../types';

export const recipeKeys = {
  all: ['recipes'] as const,
  list: (params?: { search?: string; tags?: string[]; site?: string }) => ['recipes', 'list', params] as const,
  sites: () => ['recipes', 'sites'] as const,
  detail: (id: string) => ['recipes', 'detail', id] as const,
  images: (id: string) => ['recipes', 'images', id] as const,
  collections: (id: string) => ['recipes', 'collections', id] as const,
  shared: (token: string) => ['recipes', 'shared', token] as const,
};

export function useRecipes(params?: { search?: string; tags?: string[]; site?: string }) {
  return useQuery({
    queryKey: recipeKeys.list(params),
    queryFn: () => recipesApi.list(params),
  });
}

export function useRecipeSites() {
  return useQuery({
    queryKey: recipeKeys.sites(),
    queryFn: () => recipesApi.listSites(),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
  });
}

export function useSharedRecipe(token: string) {
  return useQuery({
    queryKey: recipeKeys.shared(token),
    queryFn: () => recipesApi.getShared(token),
    enabled: !!token,
    retry: false,
  });
}

export function useRecipeImages(id: string, opts: { pollUntilLoaded?: boolean } = {}) {
  return useQuery({
    queryKey: recipeKeys.images(id),
    queryFn: () => recipesApi.listImages(id),
    enabled: !!id,
    refetchInterval: opts.pollUntilLoaded ? 3000 : false,
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recipesApi.patch>[1] }) =>
      recipesApi.patch(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recipesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => recipesApi.create(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDuplicateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipe: Recipe) => {
      const created = await recipesApi.create(`${recipe.title} (copy)`);
      await recipesApi.patch(created.id, {
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        notes: recipe.notes,
      });
      if (recipe.tags.length) await recipesApi.setTags(created.id, recipe.tags.map((t) => t.name));
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useCaptureRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => recipesApi.capture(url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useSetRecipeTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => recipesApi.setTags(id, tags),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}

export function useRecipeCollections(recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.collections(recipeId),
    queryFn: () => recipesApi.getCollections(recipeId),
    enabled: !!recipeId,
  });
}

export function useToggleRecipeInCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, recipeId, inCollection }: { collectionId: string; recipeId: string; inCollection: boolean }) =>
      inCollection
        ? collectionsApi.removeRecipe(collectionId, recipeId)
        : collectionsApi.addRecipe(collectionId, recipeId),
    onSuccess: (_data, { recipeId }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.collections(recipeId) });
      qc.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useUploadRecipeImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => recipesApi.uploadImage(id, file),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.images(id) });
      qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}

export function useDeleteRecipeImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, imageId }: { id: string; imageId: string }) => recipesApi.deleteImage(id, imageId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.images(id) });
      qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}

export function useSetCoverImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, imageId }: { id: string; imageId: string }) => recipesApi.setCoverImage(id, imageId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}
