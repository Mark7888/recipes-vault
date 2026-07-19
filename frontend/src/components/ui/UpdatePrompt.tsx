import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Installed PWAs resume from memory without navigating, so the browser never
// re-fetches sw.js on its own — poll while open and whenever the app returns
// to the foreground.
function scheduleUpdateChecks(registration: ServiceWorkerRegistration) {
  const check = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      registration.update().catch(() => {});
    }
  };
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', check);
}

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) scheduleUpdateChecks(registration);
    },
  });

  if (!needRefresh) return null;

  return (
    <Box
      position="fixed"
      insetX={4}
      bottom={{ base: 'calc(72px + env(safe-area-inset-bottom))', md: 4 }}
      zIndex={1400}
      maxW="360px"
      mx="auto"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      shadow="lg"
      px={4}
      py={3}
      role="status"
    >
      <HStack justify="space-between" gap={3}>
        <Text fontSize="sm" color="gray.700">
          New version available
        </Text>
        <Button size="sm" colorPalette="green" onClick={() => void updateServiceWorker()}>
          Reload
        </Button>
      </HStack>
    </Box>
  );
}
