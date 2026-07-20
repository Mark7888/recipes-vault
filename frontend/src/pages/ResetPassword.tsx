import { useState, useEffect } from 'react';
import { Box, Button, Heading, VStack, Text, Container } from '@chakra-ui/react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { PasswordInput } from '../components/ui/PasswordInput';
import { PasswordRequirements } from '../components/ui/PasswordRequirements';
import { validatePassword } from '../utils/password';
import { getErrorMessage } from '../utils/errors';

function StatusBox({ message, variant }: { message: string; variant: 'error' | 'success' }) {
  const isError = variant === 'error';
  return (
    <Box
      w="full"
      p={3}
      bg={isError ? 'red.50' : 'green.50'}
      borderRadius="md"
      borderWidth="1px"
      borderColor={isError ? 'red.200' : 'green.200'}
    >
      <Text color={isError ? 'red.600' : 'green.700'} fontSize="sm">{message}</Text>
    </Box>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reset password. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm">
        <Box bg="white" p={8} borderRadius="xl" shadow="md">
          <VStack gap={6}>
            <Heading size="lg" color="green.700">Reset Password</Heading>
            {success ? (
              <StatusBox message="Password reset! Redirecting to login..." variant="success" />
            ) : !token ? (
              <StatusBox message="Invalid or missing reset token." variant="error" />
            ) : (
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack gap={4}>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">New Password</Text>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      required
                    />
                    {password.length > 0 && <Box mt={2}><PasswordRequirements password={password} /></Box>}
                  </Box>
                  <Box w="full">
                    <Text mb={1} fontWeight="medium" fontSize="sm">Confirm New Password</Text>
                    <PasswordInput
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </Box>
                  {error && <StatusBox message={error} variant="error" />}
                  <Button type="submit" colorPalette="green" w="full" loading={loading}>
                    Reset Password
                  </Button>
                </VStack>
              </form>
            )}
            <Link to="/login" style={{ fontSize: '14px', color: '#16a34a' }}>
              Back to login
            </Link>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
