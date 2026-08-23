import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, type AiCaptureParams, type AiChatMessage, type AiReworkParams } from '../api/ai.api';
import { recipeKeys } from './useRecipes';

export const aiKeys = {
  status: () => ['ai', 'status'] as const,
  languages: () => ['ai', 'languages'] as const,
};

export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status(),
    queryFn: () => aiApi.status(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** The language dropdown's options. Fixed for the life of the server build. */
export function useAiLanguages() {
  return useQuery({
    queryKey: aiKeys.languages(),
    queryFn: () => aiApi.languages(),
    staleTime: Infinity,
    retry: false,
  });
}

export function useSetAiLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (language: string) => aiApi.setLanguage(language),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.status() });
    },
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

/**
 * Rewrites a saved recipe from what the library holds for it — translated,
 * scaled, whatever the user asked. The recipe keeps its id, so only what is on
 * screen has to be reloaded.
 */
export function useAiRework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: AiReworkParams) => aiApi.rework(params),
    onSuccess: ({ recipeId }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
      qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
    },
  });
}

/** Parses a URL with the AI instead of the site parsers. */
export function useAiCapture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: AiCaptureParams) => aiApi.capture(params),
    onSuccess: ({ recipeId }) => {
      qc.invalidateQueries({ queryKey: recipeKeys.all });
      // A re-parse rewrites a recipe that is very likely already on screen.
      qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
    },
  });
}
