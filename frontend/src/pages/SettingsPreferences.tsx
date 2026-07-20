import { Box, Button, Heading, HStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { PreferencesPanel } from '../components/user/PreferencesPanel';

export default function SettingsPreferences() {
  return (
    <Box maxW="400px" mx="auto" py={{ base: 2, md: 8 }}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Preferences</Heading>
        <Link to="/settings">
          <Button variant="ghost">Back</Button>
        </Link>
      </HStack>
      <PreferencesPanel />
    </Box>
  );
}
