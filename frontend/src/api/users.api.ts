import { apiClient } from './client';

export const usersApi = {
  patchMe: (data: { username?: string; currentPassword: string; newPassword?: string }) =>
    apiClient.patch('/users/me', data).then(r => r.data),
};
