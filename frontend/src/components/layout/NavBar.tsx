import { Box, Flex, HStack, Text, Button } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';

export function NavBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <Box as="header" bg="green.700" color="white" px={4} py={3} shadow="md">
      <Flex align="center" justify="space-between" maxW="1200px" mx="auto">
        <Link to="/recipes" style={{ textDecoration: 'none' }}>
          <Text fontSize="xl" fontWeight="bold" color="white">
            RecipeVault
          </Text>
        </Link>
        <HStack gap={4}>
          <Link to="/recipes" style={{ color: 'white', fontWeight: '500', textDecoration: 'none' }}>
            My Recipes
          </Link>
          <Link to="/collections" style={{ color: 'white', fontWeight: '500', textDecoration: 'none' }}>
            Collections
          </Link>
          <Link to="/recipes/add" style={{ color: 'white', fontWeight: '500', textDecoration: 'none' }}>
            + Add Recipe
          </Link>
          <Link to="/settings" style={{ color: 'white', fontWeight: '500', textDecoration: 'none' }}>
            {user?.username}
          </Link>
          <Button size="sm" variant="outline" colorPalette="gray" onClick={handleLogout} color="white" borderColor="white">
            Logout
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
