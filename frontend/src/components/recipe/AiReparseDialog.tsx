import { useState } from 'react';
import { Box, Button, Dialog, HStack, Portal, Text, VStack } from '@chakra-ui/react';
import { useAiCapture } from '../../hooks/useAi';
import { AiErrorPanel } from '../ui/AiErrorPanel';
import { getAiFailure, type AiFailure } from '../../utils/errors';
import { SparkleIcon } from '../ui/icons';

interface Props {
  open: boolean;
  recipeId: string;
  sourceUrl: string;
  /** What the parsers came back without, e.g. "ingredients" — used in the wording. */
  missing: string;
  onCancel: () => void;
  /** The recipe on the server has been rewritten; the editor has to reload it. */
  onParsed: () => void;
}

/**
 * Offered right after a capture that came back half empty: the same page, read
 * by the AI this time. The result replaces the recipe rather than adding a
 * second one, so the images the parser already downloaded stay put.
 */
export function AiReparseDialog({ open, recipeId, sourceUrl, missing, onCancel, onParsed }: Props) {
  const capture = useAiCapture();
  const [failure, setFailure] = useState<AiFailure | null>(null);

  async function run() {
    setFailure(null);
    try {
      await capture.mutateAsync({ url: sourceUrl, recipeId });
      onParsed();
    } catch (err) {
      setFailure(getAiFailure(err));
    }
  }

  function close() {
    if (capture.isPending) return;
    setFailure(null);
    onCancel();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) close(); }} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx={4} maxW="420px">
            <Dialog.Header>
              <HStack gap={2}>
                <Box color="green.fg"><SparkleIcon size={18} /></Box>
                <Dialog.Title>Let the AI try this page?</Dialog.Title>
              </HStack>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={3}>
                <Text color="fg.muted" fontSize="sm">
                  This page has no proper parser, so the capture came back without {missing}.
                  The AI can read the page itself and fill the recipe in. Any images that were
                  found are kept.
                </Text>
                {failure && (
                  <AiErrorPanel failure={failure} retrying={capture.isPending} onRetry={() => void run()} />
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={close} disabled={capture.isPending}>Not now</Button>
              <Button
                colorPalette="green"
                onClick={() => void run()}
                loading={capture.isPending}
                loadingText="Reading the page…"
              >
                <SparkleIcon size={15} /> Parse with AI
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
