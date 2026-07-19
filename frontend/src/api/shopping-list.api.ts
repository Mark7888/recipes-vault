import { apiClient } from './client';
import type { ShoppingListItem, ShoppingHistoryEntry } from '../types';

export interface ShoppingItemInput {
  name: string;
  amount?: string;
  unit?: string;
  recipeId?: string | null;
  recipeTitle?: string | null;
}

export const shoppingListApi = {
  list: () =>
    apiClient.get<ShoppingListItem[]>('/shopping-list').then(r => r.data),

  addItem: (item: ShoppingItemInput) =>
    apiClient.post<ShoppingListItem[]>('/shopping-list/items', item).then(r => r.data),

  addItems: (items: ShoppingItemInput[]) =>
    apiClient.post<ShoppingListItem[]>('/shopping-list/items/bulk', { items }).then(r => r.data),

  updateItem: (id: string, data: { name?: string; amount?: string; unit?: string; bought?: boolean }) =>
    apiClient.patch(`/shopping-list/items/${id}`, data).then(r => r.data),

  deleteItem: (id: string) =>
    apiClient.delete(`/shopping-list/items/${id}`),

  setBought: (ids: string[], bought: boolean) =>
    apiClient.post<ShoppingListItem[]>('/shopping-list/bought', { ids, bought }).then(r => r.data),

  clear: () =>
    apiClient.post<{ entry: ShoppingHistoryEntry | null }>('/shopping-list/clear').then(r => r.data),

  history: () =>
    apiClient.get<ShoppingHistoryEntry[]>('/shopping-list/history').then(r => r.data),

  readdHistory: (id: string) =>
    apiClient.post<ShoppingListItem[]>(`/shopping-list/history/${id}/readd`).then(r => r.data),

  deleteHistory: (id: string) =>
    apiClient.delete(`/shopping-list/history/${id}`),
};
