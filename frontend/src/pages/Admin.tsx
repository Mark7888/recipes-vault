import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Heading, Input, VStack, HStack, Text, Badge, Container,
} from '@chakra-ui/react';
import { adminApi, type AdminUser, type AdminInvite, type AdminPasswordReset } from '../api/admin.api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const TOKEN_KEY = 'adminToken';

function resetStatus(reset: AdminPasswordReset): { label: string; color: string } {
  if (reset.used) return { label: 'Used', color: 'gray' };
  if (reset.revokedAt) return { label: 'Revoked', color: 'red' };
  if (new Date(reset.expiresAt) < new Date()) return { label: 'Expired', color: 'orange' };
  return { label: 'Active', color: 'green' };
}

function CopyBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <HStack gap={2} bg="green.50" p={3} borderRadius="md" borderWidth="1px" borderColor="green.200">
      <Text fontSize="sm" fontFamily="mono" flex="1" wordBreak="break-all">{url}</Text>
      <Button
        size="xs"
        colorPalette="green"
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </HStack>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [resets, setResets] = useState<AdminPasswordReset[]>([]);
  const [inviteDesc, setInviteDesc] = useState('');
  const [newInviteUrl, setNewInviteUrl] = useState('');
  const [resetUrls, setResetUrls] = useState<Record<string, string>>({});
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});
  const [revokeLoading, setRevokeLoading] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async (t: string) => {
    try {
      const [u, i, r] = await Promise.all([
        adminApi.getUsers(t),
        adminApi.getInvites(t),
        adminApi.getPasswordResets(t),
      ]);
      setUsers(u);
      setInvites(i);
      setResets(r);
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken('');
    }
  }, []);

  useEffect(() => {
    if (token) loadData(token);
  }, [token, loadData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { token: t } = await adminApi.login(username, password);
      sessionStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    } catch {
      setLoginError('Invalid admin credentials');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setNewInviteUrl('');
    try {
      const link = await adminApi.createInvite(token, inviteDesc || undefined);
      setNewInviteUrl(`${window.location.origin}/register?token=${link.token}`);
      setInviteDesc('');
      await loadData(token);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCreateReset(userId: string) {
    setResetLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const link = await adminApi.createPasswordReset(token, userId);
      setResetUrls(prev => ({ ...prev, [userId]: `${window.location.origin}/reset-password?token=${link.token}` }));
      await loadData(token);
    } finally {
      setResetLoading(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevokeLoading(prev => ({ ...prev, [inviteId]: true }));
    try {
      await adminApi.revokeInvite(token, inviteId);
      await loadData(token);
    } finally {
      setRevokeLoading(prev => ({ ...prev, [inviteId]: false }));
    }
  }

  async function handleRevokeReset(resetId: string) {
    setRevokeLoading(prev => ({ ...prev, [resetId]: true }));
    try {
      await adminApi.revokePasswordReset(token, resetId);
      await loadData(token);
    } finally {
      setRevokeLoading(prev => ({ ...prev, [resetId]: false }));
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteUser(token, userToDelete.id);
      setUserToDelete(null);
      await loadData(token);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUsers([]);
    setInvites([]);
    setResets([]);
    setNewInviteUrl('');
    setResetUrls({});
  }

  if (!token) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Container maxW="sm">
          <Box bg="white" p={8} borderRadius="xl" shadow="md">
            <VStack gap={6}>
              <VStack gap={1}>
                <Heading size="lg" color="green.700">Admin Panel</Heading>
                <Text fontSize="sm" color="gray.500">RecipeVault administration</Text>
              </VStack>
              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <VStack gap={4}>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Admin Username</Text>
                    <Input value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
                  </Box>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Admin Password</Text>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </Box>
                  {loginError && (
                    <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                      <Text color="red.600" fontSize="sm">{loginError}</Text>
                    </Box>
                  )}
                  <Button type="submit" colorPalette="green" w="full" loading={loginLoading}>
                    Sign In
                  </Button>
                </VStack>
              </form>
            </VStack>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box maxW="860px" mx="auto" py={8} px={4}>
      <HStack justify="space-between" mb={8} align="baseline">
        <Heading size="xl" color="green.700">Admin Panel</Heading>
        <Button size="sm" variant="ghost" colorPalette="red" onClick={handleLogout}>Logout</Button>
      </HStack>

      {/* Invite Links */}
      <Box mb={10}>
        <Heading size="md" mb={4}>Invite Links</Heading>

        <form onSubmit={handleCreateInvite}>
          <HStack mb={4} gap={2} flexWrap="wrap">
            <Input
              placeholder="Description (optional)"
              value={inviteDesc}
              onChange={e => setInviteDesc(e.target.value)}
              maxW="320px"
            />
            <Button type="submit" colorPalette="green" loading={inviteLoading}>
              Create Invite
            </Button>
          </HStack>
        </form>

        {newInviteUrl && (
          <Box mb={5}>
            <Text fontSize="sm" fontWeight="semibold" mb={1} color="green.700">New invite URL — share this link:</Text>
            <CopyBox url={newInviteUrl} />
          </Box>
        )}

        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {invites.length === 0 ? (
            <Box p={4}><Text color="gray.500" fontSize="sm">No invite links yet.</Text></Box>
          ) : (
            invites.map((inv, i) => {
              const inactive = inv.used || !!inv.revokedAt;
              return (
                <HStack
                  key={inv.id}
                  px={4} py={3}
                  borderTopWidth={i > 0 ? '1px' : 0}
                  justify="space-between"
                  bg={inactive ? 'gray.50' : 'white'}
                  flexWrap="wrap"
                  gap={2}
                >
                  <VStack align="start" gap={0} minW="0">
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontSize="sm" fontWeight="medium" color={inactive ? 'gray.400' : 'gray.800'}>
                        {inv.description}
                      </Text>
                      {inv.used && (
                        <Badge colorPalette="gray" size="sm" fontStyle={inv.usedBy ? undefined : 'italic'}>
                          {inv.usedBy?.username ?? 'unknown'}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.400" fontFamily="mono" wordBreak="break-all">{inv.token}</Text>
                  </VStack>
                  <HStack gap={3}>
                    <Badge colorPalette={inv.used ? 'gray' : inv.revokedAt ? 'red' : 'green'} size="sm">
                      {inv.used ? 'Used' : inv.revokedAt ? 'Revoked' : 'Active'}
                    </Badge>
                    <Text fontSize="xs" color="gray.400">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </Text>
                    {!inactive && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        loading={revokeLoading[inv.id]}
                        onClick={() => handleRevokeInvite(inv.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </HStack>
                </HStack>
              );
            })
          )}
        </Box>
      </Box>

      {/* Users */}
      <Box>
        <Heading size="md" mb={4}>Users</Heading>
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {users.length === 0 ? (
            <Box p={4}><Text color="gray.500" fontSize="sm">No registered users yet.</Text></Box>
          ) : (
            users.map((user, i) => (
              <Box key={user.id}>
                <HStack
                  px={4} py={3}
                  borderTopWidth={i > 0 ? '1px' : 0}
                  justify="space-between"
                  flexWrap="wrap"
                  gap={2}
                >
                  <VStack align="start" gap={0}>
                    <HStack gap={2}>
                      <Text fontWeight="medium">{user.username}</Text>
                      {user.status === 'PENDING_DELETION' && (
                        <Badge colorPalette="red" size="sm">Deleting…</Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.400">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  </VStack>
                  {user.status === 'ACTIVE' && (
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="orange"
                        loading={resetLoading[user.id]}
                        onClick={() => handleCreateReset(user.id)}
                      >
                        Generate Reset Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setUserToDelete(user)}
                      >
                        Delete
                      </Button>
                    </HStack>
                  )}
                </HStack>
                {resetUrls[user.id] && (
                  <Box px={4} pb={3}>
                    <Text fontSize="xs" fontWeight="semibold" mb={1} color="orange.600">
                      Password reset URL — share this with {user.username}:
                    </Text>
                    <CopyBox url={resetUrls[user.id]} />
                  </Box>
                )}
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Password Reset Links */}
      <Box mt={10}>
        <Heading size="md" mb={4}>Password Reset Links</Heading>
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {resets.length === 0 ? (
            <Box p={4}><Text color="gray.500" fontSize="sm">No password reset links yet.</Text></Box>
          ) : (
            resets.map((reset, i) => {
              const status = resetStatus(reset);
              const active = status.label === 'Active';
              return (
                <HStack
                  key={reset.id}
                  px={4} py={3}
                  borderTopWidth={i > 0 ? '1px' : 0}
                  justify="space-between"
                  bg={active ? 'white' : 'gray.50'}
                  flexWrap="wrap"
                  gap={2}
                >
                  <VStack align="start" gap={0} minW="0">
                    <Text fontSize="sm" fontWeight="medium" color={active ? 'gray.800' : 'gray.400'}>
                      {reset.user.username}
                    </Text>
                    <Text fontSize="xs" color="gray.400" fontFamily="mono" wordBreak="break-all">{reset.token}</Text>
                  </VStack>
                  <HStack gap={3}>
                    <Badge colorPalette={status.color} size="sm">{status.label}</Badge>
                    <Text fontSize="xs" color="gray.400">
                      {active
                        ? `Expires ${new Date(reset.expiresAt).toLocaleString()}`
                        : new Date(reset.createdAt).toLocaleDateString()}
                    </Text>
                    {active && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        loading={revokeLoading[reset.id]}
                        onClick={() => handleRevokeReset(reset.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </HStack>
                </HStack>
              );
            })
          )}
        </Box>
      </Box>

      <ConfirmDialog
        open={!!userToDelete}
        title="Delete user"
        message={`Delete ${userToDelete?.username ?? ''}? Their recipes in shared collections and collections shared with others are kept; everything else is removed. This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </Box>
  );
}
