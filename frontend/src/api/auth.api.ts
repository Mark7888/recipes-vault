import axios from 'axios';
import { apiClient } from './client';

export const authApi = {
  checkInvite: (token: string) =>
    apiClient.get(`/auth/invites/${encodeURIComponent(token)}`)
      .then(r => r.data as { valid: boolean; reason?: 'not_found' | 'revoked' | 'used' }),

  register: (token: string, username: string, password: string) =>
    // The browser's language is what the AI assistant starts out answering in;
    // the server falls back to the request header and then to English.
    apiClient.post('/auth/register', { token, username, password, language: navigator.language })
      .then(r => r.data),

  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }).then(r => r.data),

  refresh: () =>
    axios.post('/api/auth/refresh', {}, { withCredentials: true }).then(r => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then(r => r.data),
};
