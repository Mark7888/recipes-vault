import { apiClient } from './client';
import type { Recipe } from '../types';
import type { RecipeOriginFilter } from '../utils/origin';

export type RecipeSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'prep-time';

export interface RecipeListParams {
  search?: string;
  tags?: string[];
  site?: string;
  origin?: RecipeOriginFilter;
  sort?: RecipeSort;
  limit?: number;
  offset?: number;
}

export interface RecipeUpdate extends Partial<Recipe> {
  /** Tells the server the user changed the draft, so a parse becomes an edited parse. */
  modified?: boolean;
}

export interface CaptureResult {
  recipeId: string;
  /** The parsers came back without ingredients or without steps. */
  incomplete: boolean;
}

export interface RecipeListResult {
  items: Recipe[];
  total: number;
  hasMore: boolean;
}

export const recipesApi = {
  list: (params?: RecipeListParams) =>
    apiClient.get<RecipeListResult>('/recipes', {
      params: {
        search: params?.search,
        'tags[]': params?.tags,
        site: params?.site,
        origin: params?.origin,
        sort: params?.sort,
        limit: params?.limit,
        offset: params?.offset,
      },
    }).then(r => r.data),

  listSites: () =>
    apiClient.get<string[]>('/recipes/sites').then(r => r.data),

  get: (id: string) =>
    apiClient.get<Recipe>(`/recipes/${id}`).then(r => r.data),

  create: (title?: string) =>
    apiClient.post<Recipe>('/recipes', { title }).then(r => r.data),

  patch: (id: string, data: RecipeUpdate) =>
    apiClient.patch<Recipe>(`/recipes/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/recipes/${id}`),

  duplicate: (id: string) =>
    apiClient.post<Recipe>(`/recipes/${id}/duplicate`).then(r => r.data),

  setTags: (id: string, tags: string[]) =>
    apiClient.post<Recipe>(`/recipes/${id}/tags`, { tags }).then(r => r.data),

  listImages: (id: string) =>
    apiClient.get(`/recipes/${id}/images`).then(r => r.data),

  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return apiClient.post(`/recipes/${id}/images`, form).then(r => r.data);
  },

  deleteImage: (id: string, imageId: string) =>
    apiClient.delete(`/recipes/${id}/images/${imageId}`),

  reorderImages: (id: string, imageIds: string[]) =>
    apiClient.patch(`/recipes/${id}/images/reorder`, { imageIds }),

  setCoverImage: (id: string, imageId: string) =>
    apiClient.patch(`/recipes/${id}/cover-image`, { imageId }).then(r => r.data),

  capture: (url: string) =>
    apiClient.post<CaptureResult>('/capture', { url }).then(r => r.data),

  share: (id: string) =>
    apiClient.post<{ token: string }>(`/recipes/${id}/share`).then(r => r.data),

  getShared: (token: string) =>
    apiClient.get<Recipe>(`/shared/${token}`).then(r => r.data),

  getCollections: (id: string) =>
    apiClient.get<{ collectionId: string; addedById: string }[]>(`/recipes/${id}/collections`).then(r => r.data),
};
