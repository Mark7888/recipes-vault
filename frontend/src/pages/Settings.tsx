import { Box, Heading } from '@chakra-ui/react';
import { SettingsPanel } from '../components/user/SettingsPanel';

export default function Settings() {
  return (
    <Box maxW="400px" mx="auto" py={{ base: 2, md: 8 }}>
      <Heading size="lg" mb={6}>Settings</Heading>
      <SettingsPanel />
    </Box>
  );
}
