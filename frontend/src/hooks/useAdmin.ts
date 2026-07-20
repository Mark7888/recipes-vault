import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';

export const adminKeys = {
  users: (token: string) => ['admin', 'users', token] as const,
  invites: (token: string) => ['admin', 'invites', token] as const,
  resets: (token: string) => ['admin', 'resets', token] as const,
};

export function useAdminUsers(token: string) {
  return useQuery({
    queryKey: adminKeys.users(token),
    queryFn: () => adminApi.getUsers(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAdminInvites(token: string) {
  return useQuery({
    queryKey: adminKeys.invites(token),
    queryFn: () => adminApi.getInvites(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAdminPasswordResets(token: string) {
  return useQuery({
    queryKey: adminKeys.resets(token),
    queryFn: () => adminApi.getPasswordResets(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      adminApi.login(username, password),
  });
}

export function useCreateAdminInvite(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (description?: string) => adminApi.createInvite(token, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.invites(token) }),
  });
}

export function useRevokeAdminInvite(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => adminApi.revokeInvite(token, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.invites(token) }),
  });
}

export function useCreateAdminPasswordReset(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.createPasswordReset(token, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.resets(token) }),
  });
}

export function useRevokeAdminPasswordReset(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resetId: string) => adminApi.revokePasswordReset(token, resetId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.resets(token) }),
  });
}

export function useDeleteAdminUser(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(token, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users(token) }),
  });
}
