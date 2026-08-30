import { apiClient } from './client';

export interface ApiKey {
  id: string;
  name: string;
  /** The first characters of the token — enough to tell keys apart, never enough to use one. */
  prefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  expired: boolean;
  active: boolean;
}

export interface CreatedApiKey {
  key: ApiKey;
  /** The secret, returned once. It is stored only as a hash, so this is the only copy. */
  token: string;
}

export const apiKeysApi = {
  list: () => apiClient.get<ApiKey[]>('/api-keys').then((r) => r.data),
  create: (data: { name: string; expiresAt: string | null }) =>
    apiClient.post<CreatedApiKey>('/api-keys', data).then((r) => r.data),
  revoke: (id: string) => apiClient.delete(`/api-keys/${id}`).then((r) => r.data),
};
