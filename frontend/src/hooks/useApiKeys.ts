import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '../api/api-keys.api';

export const apiKeysKey = ['api-keys'] as const;

export function useApiKeys() {
  return useQuery({ queryKey: apiKeysKey, queryFn: () => apiKeysApi.list() });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeysKey }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: apiKeysKey }),
  });
}
