import { apiClient } from './client';
import type { Tag } from '../types';

export const tagsApi = {
  search: (search: string) =>
    apiClient.get<Tag[]>('/tags', { params: { search } }).then(r => r.data),
};
