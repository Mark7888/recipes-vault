import axios from 'axios';
import { apiClient } from './client';

export const authApi = {
  register: (token: string, username: string, password: string) =>
    apiClient.post('/auth/register', { token, username, password }).then(r => r.data),

  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }).then(r => r.data),

  refresh: () =>
    axios.post('/api/auth/refresh', {}, { withCredentials: true }).then(r => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then(r => r.data),
};
