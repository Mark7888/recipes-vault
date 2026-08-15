import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, type AiChatMessage } from '../api/ai.api';
import { recipeKeys } from './useRecipes';

export const aiKeys = {
  status: () => ['ai', 'status'] as const,
};

export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status(),
    queryFn: () => aiApi.status(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: (messages: AiChatMessage[]) => aiApi.chat(messages),
  });
}

export function useAiCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messages: AiChatMessage[]) => aiApi.createRecipe(messages),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}
