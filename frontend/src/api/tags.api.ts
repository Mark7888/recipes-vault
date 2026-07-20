import { apiClient } from './client';
import type { Tag } from '../types';

export interface TagWithCount extends Tag {
  recipeCount: number;
}

export const tagsApi = {
  search: (search: string) =>
    apiClient.get<Tag[]>('/tags', { params: { search } }).then(r => r.data),
  listAll: () =>
    apiClient.get<TagWithCount[]>('/tags/all').then(r => r.data),
  rename: (id: string, name: string) =>
    apiClient.patch<Tag>(`/tags/${id}`, { name }).then(r => r.data),
  merge: (id: string, targetId: string) =>
    apiClient.post<Tag>(`/tags/${id}/merge`, { targetId }).then(r => r.data),
  delete: (id: string) =>
    apiClient.delete(`/tags/${id}`),
};
