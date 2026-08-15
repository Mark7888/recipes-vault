import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { RefreshIcon } from './icons';
import type { AiFailure } from '../../utils/errors';

interface Props {
  failure: AiFailure;
  /** Omit when there is nothing sensible to resend. */
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * The one way every AI feature reports a failure: the message the server wrote
 * for the user, plus a retry only when the server said retrying could work.
 */
export function AiErrorPanel({ failure, onRetry, retrying }: Props) {
  return (
    <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
      <VStack align="start" gap={2}>
        <Text color="fg.error" fontSize="sm">{failure.message}</Text>
        {failure.retryable && onRetry && (
          <Button size="xs" variant="outline" colorPalette="red" onClick={onRetry} loading={retrying}>
            <RefreshIcon size={13} /> Try again
          </Button>
        )}
      </VStack>
    </Box>
  );
}
