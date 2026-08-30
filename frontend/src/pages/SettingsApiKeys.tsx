import { Box, Button, Heading, HStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { ApiKeysPanel } from '../components/user/ApiKeysPanel';

export default function SettingsApiKeys() {
  return (
    <Box maxW="560px" mx="auto" py={{ base: 2, md: 8 }}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">API keys</Heading>
        <Link to="/settings">
          <Button variant="ghost">Back</Button>
        </Link>
      </HStack>
      <ApiKeysPanel />
    </Box>
  );
}
