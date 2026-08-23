import { Box, Button, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAiLanguages, useAiStatus, useSetAiLanguage } from '../../hooks/useAi';
import type { AiLanguage } from '../../api/ai.api';
import { getErrorMessage } from '../../utils/errors';

/** "German (Deutsch)", or just the one name where both are the same. */
function languageLabel(language: AiLanguage): string {
  return language.name === language.nativeName ? language.name : `${language.name} (${language.nativeName})`;
}

export function PreferencesPanel() {
  const { theme, setTheme } = useTheme();
  const aiStatus = useAiStatus();
  const languages = useAiLanguages();
  const setLanguage = useSetAiLanguage();

  // No API key on the server means the assistant does not exist for anyone, so
  // there is no language for it to answer in either.
  const showAiLanguage = !!aiStatus.data?.configured;
  const options = languages.data ?? [];
  const current = aiStatus.data?.language ?? 'en';

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

      {showAiLanguage && (
        <Box>
          {/* Full width rather than paired with its label like the theme above:
              names as long as "Brazilian Portuguese (Português brasileiro)" have
              nowhere to go in the 300px the navbar popover is wide. */}
          <Text fontWeight="medium" fontSize="sm" mb={1}>AI language</Text>
          <NativeSelect.Root
            size="sm"
            w="full"
            disabled={options.length === 0 || setLanguage.isPending}
          >
            <NativeSelect.Field
              aria-label="AI language"
              value={current}
              onChange={(e) => setLanguage.mutate(e.target.value)}
            >
              {options.length === 0 ? (
                <option value={current}>Loading…</option>
              ) : (
                options.map((language) => (
                  <option key={language.code} value={language.code}>{languageLabel(language)}</option>
                ))
              )}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            What the assistant chats in, and writes captured recipes in, unless you ask
            it for something else.
          </Text>
          {setLanguage.isError && (
            <Text fontSize="xs" color="fg.error" mt={1}>
              {getErrorMessage(setLanguage.error, 'Could not save the language. Please try again.')}
            </Text>
          )}
        </Box>
      )}

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
