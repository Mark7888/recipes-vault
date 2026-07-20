import { Box, Button, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';

export function PreferencesPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <VStack align="stretch" gap={4} w="full">
      <HStack justify="space-between">
        <Text fontWeight="medium" fontSize="sm">Theme</Text>
        <NativeSelect.Root size="sm" w="140px">
          <NativeSelect.Field
            value={theme ?? 'system'}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>
      <Box>
        <Link to="/settings/tags" style={{ width: '100%', display: 'block' }}>
          <Button variant="outline" size="sm" w="full">
            Manage Tags
          </Button>
        </Link>
      </Box>
    </VStack>
  );
}
