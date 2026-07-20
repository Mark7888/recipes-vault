import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Box py={20} textAlign="center">
      <VStack gap={3}>
        <Heading size="2xl" color="green.fg">404</Heading>
        <Text color="fg.muted">This page doesn't exist.</Text>
        <Link to="/recipes">
          <Button colorPalette="green" mt={2}>Back to My Recipes</Button>
        </Link>
      </VStack>
    </Box>
  );
}
