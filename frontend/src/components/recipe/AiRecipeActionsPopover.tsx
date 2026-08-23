import { useState } from 'react';
import { Box, Button, HStack, IconButton, Popover, Portal, Text, Textarea, VStack } from '@chakra-ui/react';
import { useAiCapture, useAiRework } from '../../hooks/useAi';
import { AiErrorPanel } from '../ui/AiErrorPanel';
import { SparkleIcon } from '../ui/icons';
import { getAiFailure, type AiFailure } from '../../utils/errors';
import { getSiteDomain } from '../../utils/site';

/** Matches the cap the server puts on the instructions. */
const MAX_INSTRUCTIONS = 500;

interface Props {
  recipeId: string;
  /** Set only on recipes that came from a page, which is what unlocks the re-read. */
  sourceUrl?: string;
  /** True while the editor holds edits that were never saved. */
  dirty: boolean;
  /** The recipe on the server has been rewritten; the editor has to reload it. */
  onReworked: () => void;
}

/**
 * The sparkle in the editor's button row: a line of instructions ("translate
 * this to German") and the two ways to carry it out — over the recipe as it is
 * saved, or over the page it originally came from. Both rewrite the recipe in
 * place, so it keeps its images, its share link and its collections.
 */
export function AiRecipeActionsPopover({ recipeId, sourceUrl, dirty, onReworked }: Props) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [failure, setFailure] = useState<AiFailure | null>(null);
  // Which button the last attempt came from, so "Try again" resends that one.
  const [lastRun, setLastRun] = useState<'saved' | 'page' | null>(null);

  const rework = useAiRework();
  const capture = useAiCapture();

  const domain = getSiteDomain(sourceUrl);
  const busy = rework.isPending || capture.isPending;
  const trimmed = instructions.trim();
  const tooLong = trimmed.length > MAX_INSTRUCTIONS;
  const ready = trimmed.length > 0 && !tooLong;

  const finish = () => {
    setInstructions('');
    setFailure(null);
    setLastRun(null);
    setOpen(false);
    onReworked();
  };

  const run = async (which: 'saved' | 'page') => {
    if (!ready || busy) return;
    setFailure(null);
    setLastRun(which);
    try {
      if (which === 'saved') {
        await rework.mutateAsync({ recipeId, instructions: trimmed });
      } else {
        await capture.mutateAsync({ url: sourceUrl!, recipeId, instructions: trimmed });
      }
      finish();
    } catch (err) {
      setFailure(getAiFailure(err));
    }
  };

  const close = () => {
    if (busy) return;
    setFailure(null);
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(e) => (e.open ? setOpen(true) : close())}
      positioning={{ placement: 'bottom-end' }}
      // The instructions field is what the popup is for, so it gets the caret.
      initialFocusEl={() => document.getElementById('ai-recipe-instructions')}
    >
      <Popover.Trigger asChild>
        <IconButton
          aria-label="Rework this recipe with AI"
          title="Rework this recipe with AI"
          variant="outline"
          colorPalette="green"
        >
          <SparkleIcon size={18} />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          {/* Sized to sit inside the smallest phone with the page padding intact. */}
          <Popover.Content w="360px" maxW="calc(100vw - 24px)">
            <Popover.Arrow />
            <Popover.Body>
              <VStack align="stretch" gap={3}>
                <HStack gap={2}>
                  <Box color="green.fg"><SparkleIcon size={16} /></Box>
                  <Text fontWeight="semibold" fontSize="sm">Rework with AI</Text>
                </HStack>

                <Box>
                  <Textarea
                    id="ai-recipe-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Translate this to German"
                    rows={3}
                    resize="none"
                    size="sm"
                    disabled={busy}
                  />
                  <HStack justify="space-between" gap={2} mt={1} align="start">
                    <Text fontSize="xs" color="fg.muted">
                      Tell the AI what to change — translate it, scale it, make it vegan.
                    </Text>
                    {trimmed.length > MAX_INSTRUCTIONS - 100 && (
                      <Text fontSize="xs" color={tooLong ? 'fg.error' : 'fg.muted'} flexShrink={0}>
                        {trimmed.length}/{MAX_INSTRUCTIONS}
                      </Text>
                    )}
                  </HStack>
                </Box>

                {dirty && (
                  <Text fontSize="xs" color="fg.warning">
                    The AI works from the saved recipe, so the changes you have not saved yet
                    will be lost.
                  </Text>
                )}

                {failure && (
                  <AiErrorPanel
                    failure={failure}
                    retrying={busy}
                    onRetry={lastRun ? () => void run(lastRun) : undefined}
                  />
                )}

                <VStack align="stretch" gap={1}>
                  <Button
                    colorPalette="green"
                    size="sm"
                    w="full"
                    onClick={() => void run('saved')}
                    loading={rework.isPending}
                    loadingText="Reworking…"
                    disabled={!ready || busy}
                  >
                    <SparkleIcon size={15} /> Use this recipe
                  </Button>
                  <Text fontSize="xs" color="fg.muted">
                    Works from the ingredients, steps and notes saved here.
                  </Text>
                </VStack>

                {sourceUrl && (
                  <VStack align="stretch" gap={1}>
                    <Button
                      variant="outline"
                      colorPalette="green"
                      size="sm"
                      w="full"
                      onClick={() => void run('page')}
                      loading={capture.isPending}
                      loadingText="Reading the page…"
                      disabled={!ready || busy}
                    >
                      <SparkleIcon size={15} /> Read the original page
                    </Button>
                    <Text fontSize="xs" color="fg.muted" wordBreak="break-word">
                      Fetches {domain ?? 'the original page'} again and parses it from scratch.
                    </Text>
                  </VStack>
                )}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
