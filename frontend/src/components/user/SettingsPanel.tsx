import { useState } from 'react';
import { Box, Button, Input, VStack, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/users.api';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { PasswordInput } from '../ui/PasswordInput';
import { PasswordRequirements } from '../ui/PasswordRequirements';
import { getErrorMessage } from '../../utils/errors';

export function SettingsPanel() {
  const { user, setAuth, accessToken, logout } = useAuthStore();
  const navigate = useNavigate();
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
      setError(getErrorMessage(err, 'Failed to update settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <VStack align="stretch" gap={4} w="full">
      <Text color="fg.muted" fontSize="sm">Signed in as <strong>{user?.username}</strong></Text>
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
            <Text mb={1} fontWeight="medium" fontSize="sm">Current Password <Text as="span" color="fg.error">*</Text></Text>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Box>
          <Box w="full">
            <Text mb={1} fontWeight="medium" fontSize="sm">New Password (optional)</Text>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            {newPassword.length > 0 && <Box mt={2}><PasswordRequirements password={newPassword} /></Box>}
          </Box>
          {newPassword && (
            <Box w="full">
              <Text mb={1} fontWeight="medium" fontSize="sm">Confirm New Password</Text>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Box>
          )}
          {error && (
            <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
              <Text color="fg.error" fontSize="sm">{error}</Text>
            </Box>
          )}
          {success && (
            <Box w="full" p={3} bg="bg.success" borderRadius="md" borderWidth="1px" borderColor="border.success">
              <Text color="fg.success" fontSize="sm">{success}</Text>
            </Box>
          )}
          <Button type="submit" colorPalette="green" w="full" loading={loading}>
            Save Changes
          </Button>
        </VStack>
      </form>
      <Box borderTopWidth="1px" pt={4}>
        <Button variant="outline" colorPalette="red" size="sm" w="full" onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    </VStack>
  );
}
