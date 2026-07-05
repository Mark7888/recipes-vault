import { apiClient } from './client';
import type { Recipe } from '../types';

export const recipesApi = {
  list: (params?: { search?: string; tags?: string[]; site?: string }) =>
    apiClient.get<Recipe[]>('/recipes', { params: { search: params?.search, 'tags[]': params?.tags, site: params?.site } }).then(r => r.data),

  listSites: () =>
    apiClient.get<string[]>('/recipes/sites').then(r => r.data),

  get: (id: string) =>
    apiClient.get<Recipe>(`/recipes/${id}`).then(r => r.data),

  create: (title?: string) =>
    apiClient.post<Recipe>('/recipes', { title }).then(r => r.data),

  patch: (id: string, data: Partial<Recipe>) =>
    apiClient.patch<Recipe>(`/recipes/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/recipes/${id}`),

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

  setCoverImage: (id: string, imageId: string) =>
    apiClient.patch(`/recipes/${id}/cover-image`, { imageId }).then(r => r.data),

  capture: (url: string) =>
    apiClient.post<{ recipeId: string }>('/capture', { url }).then(r => r.data),

  getCollections: (id: string) =>
    apiClient.get<{ collectionId: string; addedById: string }[]>(`/recipes/${id}/collections`).then(r => r.data),
};
