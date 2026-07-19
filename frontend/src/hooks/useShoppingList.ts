import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListApi, type ShoppingItemInput } from '../api/shopping-list.api';

export const shoppingKeys = {
  all: ['shopping'] as const,
  list: () => ['shopping', 'list'] as const,
  history: () => ['shopping', 'history'] as const,
};

export function useShoppingList() {
  return useQuery({
    queryKey: shoppingKeys.list(),
    queryFn: () => shoppingListApi.list(),
  });
}

export function useShoppingHistory() {
  return useQuery({
    queryKey: shoppingKeys.history(),
    queryFn: () => shoppingListApi.history(),
  });
}

function useInvalidateList() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: shoppingKeys.list() });
}

export function useAddShoppingItem() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (item: ShoppingItemInput) => shoppingListApi.addItem(item),
    onSuccess: invalidate,
  });
}

export function useAddShoppingItems() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (items: ShoppingItemInput[]) => shoppingListApi.addItems(items),
    onSuccess: invalidate,
  });
}

export function useUpdateShoppingItem() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; amount?: string; unit?: string; bought?: boolean } }) =>
      shoppingListApi.updateItem(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteShoppingItem() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (id: string) => shoppingListApi.deleteItem(id),
    onSuccess: invalidate,
  });
}

export function useSetItemsBought() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: ({ ids, bought }: { ids: string[]; bought: boolean }) =>
      shoppingListApi.setBought(ids, bought),
    onSuccess: invalidate,
  });
}

export function useClearShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shoppingListApi.clear(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shoppingKeys.all });
    },
  });
}

export function useReaddHistory() {
  const invalidate = useInvalidateList();
  return useMutation({
    mutationFn: (id: string) => shoppingListApi.readdHistory(id),
    onSuccess: invalidate,
  });
}

export function useDeleteHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shoppingListApi.deleteHistory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shoppingKeys.history() });
    },
  });
}
