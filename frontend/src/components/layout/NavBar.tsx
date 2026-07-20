import { Box, Flex, HStack, Text, Button, IconButton, Popover, Portal } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { SettingsPanel } from '../user/SettingsPanel';
import { PreferencesPanel } from '../user/PreferencesPanel';
import { SettingsIcon } from '../ui/icons';

const desktopLinkStyle: React.CSSProperties = {
  color: 'white',
  fontWeight: '500',
  textDecoration: 'none',
};

export function NavBar() {
  const { user } = useAuthStore();

  return (
    <Box as="header" bg="green.700" color="white" px={4} py={3} shadow="md" hideBelow="md">
      <Flex align="center" justify="space-between" maxW="1200px" mx="auto">
        <Link to="/recipes" style={{ textDecoration: 'none' }}>
          <Text fontSize="xl" fontWeight="bold" color="white">
            RecipeVault
          </Text>
        </Link>

        {/* Desktop nav; mobile uses the fixed BottomNav instead */}
        <HStack gap={4} hideBelow="md">
          <Link to="/recipes" style={desktopLinkStyle}>My Recipes</Link>
          <Link to="/collections" style={desktopLinkStyle}>Collections</Link>
          <Link to="/shopping" style={desktopLinkStyle}>Shopping</Link>
          <Link to="/recipes/add" style={desktopLinkStyle}>+ Add Recipe</Link>
          <Popover.Root positioning={{ placement: 'bottom-end' }}>
            <Popover.Trigger asChild>
              <IconButton
                aria-label="Preferences"
                size="sm"
                variant="outline"
                colorPalette="gray"
                color="white"
                borderColor="whiteAlpha.600"
                _hover={{ bg: 'green.600' }}
              >
                <SettingsIcon size={16} />
              </IconButton>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content w="300px" maxW="90vw">
                  <Popover.Arrow />
                  <Popover.Body>
                    <PreferencesPanel />
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
          <Popover.Root positioning={{ placement: 'bottom-end' }}>
            <Popover.Trigger asChild>
              <Button size="sm" variant="outline" colorPalette="gray" color="white" borderColor="whiteAlpha.600" _hover={{ bg: 'green.600' }}>
                {user?.username}
              </Button>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content w="340px" maxW="90vw">
                  <Popover.Arrow />
                  <Popover.Body>
                    <SettingsPanel />
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        </HStack>
      </Flex>
    </Box>
  );
}
