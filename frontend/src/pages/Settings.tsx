import { useState } from 'react';
import { Box, Button, Heading, Input, VStack, Text } from '@chakra-ui/react';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/authStore';

export default function Settings() {
  const { user, setAuth, accessToken } = useAuthStore();
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!currentPassword) return 'Current password is required';
    if (newPassword && newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword && !/[A-Z]/.test(newPassword)) return 'New password must contain at least one uppercase letter';
    if (newPassword && !/[0-9]/.test(newPassword)) return 'New password must contain at least one number';
    if (newPassword && newPassword !== confirmPassword) return 'Passwords do not match';
    if (!username && !newPassword) return 'Please change at least username or password';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updated = await usersApi.patchMe({
        username: username || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setSuccess('Settings updated successfully!');
      if (updated && user && accessToken) {
        setAuth({ ...user, username: updated.username }, accessToken);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setUsername('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="400px" mx="auto" py={8}>
      <VStack align="start" gap={6}>
        <Heading size="lg">Settings</Heading>
        <Text color="gray.500">Signed in as <strong>{user?.username}</strong></Text>
        <Box w="full" borderTopWidth="1px" />
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack gap={4}>
            <Box w="full">
              <Text mb={1} fontWeight="medium" fontSize="sm">New Username (optional)</Text>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={user?.username}
              />
            </Box>
            <Box w="full">
              <Text mb={1} fontWeight="medium" fontSize="sm">Current Password <Text as="span" color="red.500">*</Text></Text>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Box>
            <Box w="full">
              <Text mb={1} fontWeight="medium" fontSize="sm">New Password (optional)</Text>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
            </Box>
            {newPassword && (
              <Box w="full">
                <Text mb={1} fontWeight="medium" fontSize="sm">Confirm New Password</Text>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Box>
            )}
            {error && (
              <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}
            {success && (
              <Box w="full" p={3} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
                <Text color="green.700" fontSize="sm">{success}</Text>
              </Box>
            )}
            <Button type="submit" colorPalette="green" w="full" loading={loading}>
              Save Changes
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}
