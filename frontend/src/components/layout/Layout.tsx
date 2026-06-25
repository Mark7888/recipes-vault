import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';

export function Layout() {
  return (
    <Flex direction="column" minH="100vh">
      <NavBar />
      <Box as="main" flex="1" p={4} maxW="1200px" mx="auto" w="full">
        <Outlet />
      </Box>
    </Flex>
  );
}
