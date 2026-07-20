import { Box, Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { AddIcon, CartIcon, CollectionsIcon, RecipesIcon, UserIcon } from '../ui/icons';

const items = [
  { to: '/recipes', label: 'Recipes', icon: <RecipesIcon />, isActive: (p: string) => p.startsWith('/recipes') && p !== '/recipes/add' },
  { to: '/collections', label: 'Collections', icon: <CollectionsIcon />, isActive: (p: string) => p.startsWith('/collections') },
  { to: '/recipes/add', label: 'Add', icon: <AddIcon />, isActive: (p: string) => p === '/recipes/add' },
  { to: '/shopping', label: 'Shopping', icon: <CartIcon />, isActive: (p: string) => p.startsWith('/shopping') },
  { to: '/settings', label: 'User', icon: <UserIcon />, isActive: (p: string) => p.startsWith('/settings') },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <Box
      as="nav"
      hideFrom="md"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={20}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      pb="env(safe-area-inset-bottom)"
      shadow="0 -1px 4px rgba(0,0,0,0.06)"
    >
      <Flex>
        {items.map((item) => {
          const active = item.isActive(location.pathname);
          return (
            <Link key={item.label} to={item.to} style={{ flex: 1, textDecoration: 'none' }}>
              <Flex
                direction="column"
                align="center"
                gap={0.5}
                py={2}
                color={active ? 'green.600' : 'fg.muted'}
                _active={{ bg: 'bg.subtle' }}
              >
                {item.icon}
                <Text fontSize="xs" fontWeight={active ? 'semibold' : 'normal'}>
                  {item.label}
                </Text>
              </Flex>
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
}
