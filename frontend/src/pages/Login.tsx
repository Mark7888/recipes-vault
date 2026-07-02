import { useState } from 'react';
import { Box, Button, Heading, Input, VStack, Text, Container } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      setAuth(data.user, data.accessToken);
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        // Full navigation: the redirect target is the capture catch-all route,
        // not an in-app SPA route, so it needs a real request (with the fresh
        // refresh-token cookie) rather than client-side routing.
        window.location.href = redirect;
      } else {
        navigate('/recipes');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm">
        <Box bg="white" p={8} borderRadius="xl" shadow="md">
          <VStack gap={6}>
            <Heading size="lg" color="green.700">RecipeVault</Heading>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack gap={4}>
                <Box w="full">
                  <Text mb={1} fontWeight="medium" fontSize="sm">Username</Text>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </Box>
                <Box w="full">
                  <Text mb={1} fontWeight="medium" fontSize="sm">Password</Text>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </Box>
                {error && (
                  <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                    <Text color="red.600" fontSize="sm">{error}</Text>
                  </Box>
                )}
                <Button type="submit" colorPalette="green" w="full" loading={loading}>
                  Sign In
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Forgot your password? Ask the admin to generate a reset link.
        </Text>
      </Container>
    </Box>
  );
}
