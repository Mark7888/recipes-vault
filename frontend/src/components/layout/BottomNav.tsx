import { Box, Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';

function RecipesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function CollectionsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
      bg="white"
      borderTopWidth="1px"
      borderColor="gray.200"
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
                color={active ? 'green.600' : 'gray.500'}
                _active={{ bg: 'gray.50' }}
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
