import axios from 'axios';

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const adminApi = {
  login: (username: string, password: string) =>
    axios.post('/api/admin/login', { username, password }).then(r => r.data as { token: string }),

  getUsers: (token: string) =>
    axios.get('/api/admin/users', auth(token)).then(r => r.data as Array<{ id: string; username: string; createdAt: string }>),

  getInvites: (token: string) =>
    axios.get('/api/admin/invites', auth(token)).then(r => r.data as Array<{ id: string; token: string; description: string; used: boolean; createdAt: string }>),

  createInvite: (token: string, description?: string) =>
    axios.post('/api/admin/invites', { description }, auth(token)).then(r => r.data as { token: string }),

  createPasswordReset: (token: string, userId: string) =>
    axios.post('/api/admin/password-resets', { userId }, auth(token)).then(r => r.data as { token: string }),
};
