import { apiClient } from './client';
import type { Collection, IncomingTransfer, Role, User } from '../types';

export const collectionsApi = {
  list: () =>
    apiClient.get<Collection[]>('/collections').then(r => r.data),

  create: (name: string) =>
    apiClient.post<Collection>('/collections', { name }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Collection>(`/collections/${id}`).then(r => r.data),

  rename: (id: string, name: string) =>
    apiClient.patch<Collection>(`/collections/${id}`, { name }).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/collections/${id}`),

  addMember: (id: string, userId: string, role: Role) =>
    apiClient.post(`/collections/${id}/members`, { userId, role }).then(r => r.data),

  updateMemberRole: (id: string, userId: string, role: Role) =>
    apiClient.patch(`/collections/${id}/members/${userId}`, { role }).then(r => r.data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/collections/${id}/members/${userId}`),

  leave: (id: string) =>
    apiClient.post(`/collections/${id}/leave`),

  addRecipe: (id: string, recipeId: string) =>
    apiClient.post(`/collections/${id}/recipes`, { recipeId }).then(r => r.data),

  removeRecipe: (id: string, recipeId: string) =>
    apiClient.delete(`/collections/${id}/recipes/${recipeId}`),

  searchUsers: (q: string) =>
    apiClient.get<Pick<User, 'id' | 'username'>[]>(`/users/search`, { params: { q } }).then(r => r.data),

  listIncomingTransfers: () =>
    apiClient.get<IncomingTransfer[]>('/collections/transfers/incoming').then(r => r.data),

  transferOwnership: (id: string, toUserId: string) =>
    apiClient.post(`/collections/${id}/transfer`, { toUserId }).then(r => r.data),

  cancelTransfer: (id: string) =>
    apiClient.post(`/collections/${id}/transfer/cancel`),

  acceptTransfer: (id: string) =>
    apiClient.post(`/collections/${id}/transfer/accept`),

  rejectTransfer: (id: string) =>
    apiClient.post(`/collections/${id}/transfer/reject`),
};
