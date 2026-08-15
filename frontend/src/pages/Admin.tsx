import { useState } from 'react';
import {
  Box, Button, Heading, Input, VStack, HStack, Text, Badge, Container,
} from '@chakra-ui/react';
import type { AdminUser, AdminInvite, AdminPasswordReset } from '../api/admin.api';
import {
  useAdminUsers, useAdminInvites, useAdminPasswordResets, useAdminLogin,
  useCreateAdminInvite, useRevokeAdminInvite, useCreateAdminPasswordReset,
  useRevokeAdminPasswordReset, useDeleteAdminUser, useSetAdminUserAiAccess,
} from '../hooks/useAdmin';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PasswordInput } from '../components/ui/PasswordInput';
import { getErrorMessage } from '../utils/errors';
import { formatDate, formatDateTime } from '../utils/date';

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
    <HStack gap={2} bg="bg.success" p={3} borderRadius="md" borderWidth="1px" borderColor="border.success">
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

  const usersQuery = useAdminUsers(token);
  const invitesQuery = useAdminInvites(token);
  const resetsQuery = useAdminPasswordResets(token);
  const users = usersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const resets = resetsQuery.data ?? [];

  const adminLogin = useAdminLogin();
  const createInvite = useCreateAdminInvite(token);
  const revokeInvite = useRevokeAdminInvite(token);
  const createReset = useCreateAdminPasswordReset(token);
  const revokeReset = useRevokeAdminPasswordReset(token);
  const deleteUserMutation = useDeleteAdminUser(token);
  const setAiAccess = useSetAdminUserAiAccess(token);

  const [inviteDesc, setInviteDesc] = useState('');
  const [newInviteUrl, setNewInviteUrl] = useState('');
  const [resetUrls, setResetUrls] = useState<Record<string, string>>({});
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<AdminInvite | null>(null);
  const [resetToRevoke, setResetToRevoke] = useState<AdminPasswordReset | null>(null);
  const [actionError, setActionError] = useState('');

  // A 401 on any authenticated query means the token is stale — drop back to the login screen.
  if (token && (usersQuery.isError || invitesQuery.isError || resetsQuery.isError)) {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    try {
      const { token: t } = await adminLogin.mutateAsync({ username, password });
      sessionStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    } catch {
      setLoginError('Invalid admin credentials');
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setActionError('');
    setNewInviteUrl('');
    try {
      const link = await createInvite.mutateAsync(inviteDesc || undefined);
      setNewInviteUrl(`${window.location.origin}/register?token=${link.token}`);
      setInviteDesc('');
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to create invite link.'));
    }
  }

  async function handleCreateReset(userId: string) {
    setActionError('');
    try {
      const link = await createReset.mutateAsync(userId);
      setResetUrls((prev) => ({ ...prev, [userId]: `${window.location.origin}/reset-password?token=${link.token}` }));
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to create reset link.'));
    }
  }

  async function handleRevokeInvite() {
    if (!inviteToRevoke) return;
    setActionError('');
    try {
      await revokeInvite.mutateAsync(inviteToRevoke.id);
      setInviteToRevoke(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to revoke invite link.'));
    }
  }

  async function handleRevokeReset() {
    if (!resetToRevoke) return;
    setActionError('');
    try {
      await revokeReset.mutateAsync(resetToRevoke.id);
      setResetToRevoke(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to revoke reset link.'));
    }
  }

  async function handleToggleAi(user: AdminUser) {
    setActionError('');
    try {
      await setAiAccess.mutateAsync({ userId: user.id, enabled: !user.aiEnabled });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to change AI access.'));
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    setActionError('');
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setUserToDelete(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to delete user.'));
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setNewInviteUrl('');
    setResetUrls({});
  }

  if (!token) {
    return (
      <Box minH="100vh" bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
        <Container maxW="sm">
          <Box bg="bg.panel" p={8} borderRadius="xl" shadow="md">
            <VStack gap={6}>
              <VStack gap={1}>
                <Heading size="lg" color="green.fg">Admin Panel</Heading>
                <Text fontSize="sm" color="fg.muted">RecipeVault administration</Text>
              </VStack>
              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <VStack gap={4}>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Admin Username</Text>
                    <Input value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
                  </Box>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Admin Password</Text>
                    <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
                  </Box>
                  {loginError && (
                    <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
                      <Text color="fg.error" fontSize="sm">{loginError}</Text>
                    </Box>
                  )}
                  <Button type="submit" colorPalette="green" w="full" loading={adminLogin.isPending}>
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
        <Heading size="xl" color="green.fg">Admin Panel</Heading>
        <Button size="sm" variant="ghost" colorPalette="red" onClick={handleLogout}>Logout</Button>
      </HStack>

      {actionError && (
        <Box mb={6} p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
          <Text color="fg.error" fontSize="sm">{actionError}</Text>
        </Box>
      )}

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
            <Button type="submit" colorPalette="green" loading={createInvite.isPending}>
              Create Invite
            </Button>
          </HStack>
        </form>

        {newInviteUrl && (
          <Box mb={5}>
            <Text fontSize="sm" fontWeight="semibold" mb={1} color="green.fg">New invite URL — share this link:</Text>
            <CopyBox url={newInviteUrl} />
          </Box>
        )}

        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {invites.length === 0 ? (
            <Box p={4}><Text color="fg.muted" fontSize="sm">No invite links yet.</Text></Box>
          ) : (
            invites.map((inv, i) => {
              const inactive = inv.used || !!inv.revokedAt;
              return (
                <HStack
                  key={inv.id}
                  px={4} py={3}
                  borderTopWidth={i > 0 ? '1px' : 0}
                  justify="space-between"
                  bg={inactive ? 'bg.subtle' : 'bg.panel'}
                  flexWrap="wrap"
                  gap={2}
                >
                  <VStack align="start" gap={0} minW="0">
                    <HStack gap={2} flexWrap="wrap">
                      <Text fontSize="sm" fontWeight="medium" color={inactive ? 'fg.subtle' : 'fg'}>
                        {inv.description}
                      </Text>
                      {inv.used && (
                        <Badge colorPalette="gray" size="sm" fontStyle={inv.usedBy ? undefined : 'italic'}>
                          {inv.usedBy?.username ?? 'unknown'}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="fg.subtle" fontFamily="mono" wordBreak="break-all">{inv.token}</Text>
                  </VStack>
                  <HStack gap={3}>
                    <Badge colorPalette={inv.used ? 'gray' : inv.revokedAt ? 'red' : 'green'} size="sm">
                      {inv.used ? 'Used' : inv.revokedAt ? 'Revoked' : 'Active'}
                    </Badge>
                    <Text fontSize="xs" color="fg.subtle">
                      {formatDate(inv.createdAt)}
                    </Text>
                    {!inactive && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setInviteToRevoke(inv)}
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
        <Heading size="md" mb={1}>Users</Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          The AI recipe assistant is off for every account by default — enable it per user here.
        </Text>
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {users.length === 0 ? (
            <Box p={4}><Text color="fg.muted" fontSize="sm">No registered users yet.</Text></Box>
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
                      {user.status === 'ACTIVE' && user.aiEnabled && (
                        <Badge colorPalette="green" size="sm">AI enabled</Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="fg.subtle">
                      Joined {formatDate(user.createdAt)}
                    </Text>
                  </VStack>
                  {user.status === 'ACTIVE' && (
                    <HStack gap={2} flexWrap="wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette={user.aiEnabled ? 'gray' : 'green'}
                        loading={setAiAccess.isPending && setAiAccess.variables?.userId === user.id}
                        onClick={() => handleToggleAi(user)}
                      >
                        {user.aiEnabled ? 'Disable AI' : 'Enable AI'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="orange"
                        loading={createReset.isPending && createReset.variables === user.id}
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
            <Box p={4}><Text color="fg.muted" fontSize="sm">No password reset links yet.</Text></Box>
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
                  bg={active ? 'bg.panel' : 'bg.subtle'}
                  flexWrap="wrap"
                  gap={2}
                >
                  <VStack align="start" gap={0} minW="0">
                    <Text fontSize="sm" fontWeight="medium" color={active ? 'fg' : 'fg.subtle'}>
                      {reset.user.username}
                    </Text>
                    <Text fontSize="xs" color="fg.subtle" fontFamily="mono" wordBreak="break-all">{reset.token}</Text>
                  </VStack>
                  <HStack gap={3}>
                    <Badge colorPalette={status.color} size="sm">{status.label}</Badge>
                    <Text fontSize="xs" color="fg.subtle">
                      {active
                        ? `Expires ${formatDateTime(reset.expiresAt)}`
                        : formatDate(reset.createdAt)}
                    </Text>
                    {active && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setResetToRevoke(reset)}
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
        loading={deleteUserMutation.isPending}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      <ConfirmDialog
        open={!!inviteToRevoke}
        title="Revoke invite link?"
        message={`This invite link${inviteToRevoke?.description ? ` ("${inviteToRevoke.description}")` : ''} will no longer work. This cannot be undone.`}
        confirmLabel="Revoke"
        loading={revokeInvite.isPending}
        onConfirm={handleRevokeInvite}
        onCancel={() => setInviteToRevoke(null)}
      />

      <ConfirmDialog
        open={!!resetToRevoke}
        title="Revoke reset link?"
        message={`This password reset link for ${resetToRevoke?.user.username ?? ''} will no longer work.`}
        confirmLabel="Revoke"
        loading={revokeReset.isPending}
        onConfirm={handleRevokeReset}
        onCancel={() => setResetToRevoke(null)}
      />
    </Box>
  );
}
