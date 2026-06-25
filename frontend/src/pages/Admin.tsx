import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Heading, Input, VStack, HStack, Text, Badge, Container,
} from '@chakra-ui/react';
import { adminApi } from '../api/admin.api';

interface User { id: string; username: string; createdAt: string; }
interface Invite { id: string; token: string; description: string; used: boolean; createdAt: string; }

const TOKEN_KEY = 'adminToken';

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

  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteDesc, setInviteDesc] = useState('');
  const [newInviteUrl, setNewInviteUrl] = useState('');
  const [resetUrls, setResetUrls] = useState<Record<string, string>>({});
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async (t: string) => {
    try {
      const [u, i] = await Promise.all([adminApi.getUsers(t), adminApi.getInvites(t)]);
      setUsers(u);
      setInvites(i);
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
    } finally {
      setResetLoading(prev => ({ ...prev, [userId]: false }));
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUsers([]);
    setInvites([]);
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
          <HStack mb={4} gap={2}>
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
            invites.map((inv, i) => (
              <HStack
                key={inv.id}
                px={4} py={3}
                borderTopWidth={i > 0 ? '1px' : 0}
                justify="space-between"
                bg={inv.used ? 'gray.50' : 'white'}
              >
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="medium" color={inv.used ? 'gray.400' : 'gray.800'}>
                    {inv.description}
                  </Text>
                  <Text fontSize="xs" color="gray.400" fontFamily="mono">{inv.token}</Text>
                </VStack>
                <HStack gap={3}>
                  <Badge colorPalette={inv.used ? 'gray' : 'green'} size="sm">
                    {inv.used ? 'Used' : 'Active'}
                  </Badge>
                  <Text fontSize="xs" color="gray.400">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </Text>
                </HStack>
              </HStack>
            ))
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
                >
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{user.username}</Text>
                    <Text fontSize="xs" color="gray.400">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  </VStack>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="orange"
                    loading={resetLoading[user.id]}
                    onClick={() => handleCreateReset(user.id)}
                  >
                    Generate Reset Link
                  </Button>
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
    </Box>
  );
}
