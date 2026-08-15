import axios from 'axios';

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export interface AdminUser {
  id: string;
  username: string;
  status: 'ACTIVE' | 'PENDING_DELETION';
  /** Access to the AI recipe assistant; off unless an admin turns it on. */
  aiEnabled: boolean;
  createdAt: string;
}

export interface AdminInvite {
  id: string;
  token: string;
  description: string;
  used: boolean;
  usedBy: { username: string } | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface AdminPasswordReset {
  id: string;
  token: string;
  user: { username: string };
  used: boolean;
  revokedAt: string | null;
  createdAt: string;
  expiresAt: string;
}

export const adminApi = {
  login: (username: string, password: string) =>
    axios.post('/api/admin/login', { username, password }).then(r => r.data as { token: string }),

  getUsers: (token: string) =>
    axios.get('/api/admin/users', auth(token)).then(r => r.data as AdminUser[]),

  deleteUser: (token: string, userId: string) =>
    axios.delete(`/api/admin/users/${userId}`, auth(token)).then(r => r.data as { status: string }),

  setUserAiAccess: (token: string, userId: string, enabled: boolean) =>
    axios.patch(`/api/admin/users/${userId}/ai-access`, { enabled }, auth(token)).then(r => r.data as AdminUser),

  getInvites: (token: string) =>
    axios.get('/api/admin/invites', auth(token)).then(r => r.data as AdminInvite[]),

  createInvite: (token: string, description?: string) =>
    axios.post('/api/admin/invites', { description }, auth(token)).then(r => r.data as { token: string }),

  revokeInvite: (token: string, inviteId: string) =>
    axios.delete(`/api/admin/invites/${inviteId}`, auth(token)).then(r => r.data as AdminInvite),

  createPasswordReset: (token: string, userId: string) =>
    axios.post('/api/admin/password-resets', { userId }, auth(token)).then(r => r.data as { token: string }),

  getPasswordResets: (token: string) =>
    axios.get('/api/admin/password-resets', auth(token)).then(r => r.data as AdminPasswordReset[]),

  revokePasswordReset: (token: string, resetId: string) =>
    axios.delete(`/api/admin/password-resets/${resetId}`, auth(token)).then(r => r.data as AdminPasswordReset),
};
