import { Box, Heading, HStack, IconButton } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { SettingsPanel } from '../components/user/SettingsPanel';
import { SettingsIcon } from '../components/ui/icons';

export default function Settings() {
  return (
    <Box maxW="400px" mx="auto" py={{ base: 2, md: 8 }}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Account</Heading>
        <Link to="/settings/preferences">
          <IconButton aria-label="Preferences" variant="outline" size="sm">
            <SettingsIcon size={16} />
          </IconButton>
        </Link>
      </HStack>
      <SettingsPanel />
    </Box>
  );
}
