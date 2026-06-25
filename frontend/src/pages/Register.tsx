import { useState, useEffect } from 'react';
import { Box, Button, Heading, Input, VStack, Text, Container } from '@chakra-ui/react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
      <Text color="red.600" fontSize="sm">{message}</Text>
    </Box>
  );
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) setError('Invalid or missing invite token.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const data = await authApi.register(token, username, password);
      setAuth(data.user, data.accessToken);
      navigate('/recipes');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm">
        <Box bg="white" p={8} borderRadius="xl" shadow="md">
          <VStack gap={6}>
            <Heading size="lg" color="green.700">🍳 Create Account</Heading>
            {!token ? (
              <ErrorBox message="Invalid or missing invite token." />
            ) : (
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack gap={4}>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Username</Text>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      required
                    />
                  </Box>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Password</Text>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      required
                    />
                  </Box>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Confirm Password</Text>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </Box>
                  {error && <ErrorBox message={error} />}
                  <Button type="submit" colorPalette="green" w="full" loading={loading}>
                    Create Account
                  </Button>
                </VStack>
              </form>
            )}
            <Text fontSize="sm" color="gray.500">
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#16a34a', fontWeight: 600 }}>Sign in</Link>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
