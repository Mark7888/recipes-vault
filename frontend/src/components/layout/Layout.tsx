import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <Flex direction="column" minH="100vh">
      <NavBar />
      <Box
        as="main"
        flex="1"
        px={{ base: 3, md: 4 }}
        pt={4}
        // extra bottom padding on mobile so content clears the fixed BottomNav
        pb={{ base: 'calc(76px + env(safe-area-inset-bottom))', md: 4 }}
        maxW="1200px"
        mx="auto"
        w="full"
      >
        <Outlet />
      </Box>
      <BottomNav />
    </Flex>
  );
}
