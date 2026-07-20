import { Box, Image, Dialog, Portal, IconButton } from '@chakra-ui/react';
import type { Image as RecipeImage } from '../../types';
import { ArrowLeftIcon, CloseIcon } from '../ui/icons';

interface Props {
  images: RecipeImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

// The surrounding frame is a fixed size regardless of the current image's
// dimensions, so the close/prev/next buttons stay in the same place as you
// step through images of different aspect ratios.
export function ImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  const current = index !== null ? images[index] : null;

  return (
    <Dialog.Root
      open={index !== null}
      onOpenChange={(e) => { if (!e.open) onClose(); }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="transparent" boxShadow="none" maxW="none" w="auto">
            <Box position="relative" w="90vw" h="85vh" maxW="1000px" bg="blackAlpha.800" borderRadius="lg" overflow="hidden">
              <IconButton
                aria-label="Close"
                position="absolute"
                top={2}
                right={2}
                zIndex={1}
                size="sm"
                colorPalette="gray"
                onClick={onClose}
              >
                <CloseIcon />
              </IconButton>
              {index !== null && images.length > 1 && (
                <>
                  <IconButton
                    aria-label="Previous image"
                    position="absolute"
                    left={2}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={1}
                    size="sm"
                    colorPalette="gray"
                    onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
                  >
                    <ArrowLeftIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Next image"
                    position="absolute"
                    right={2}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={1}
                    size="sm"
                    colorPalette="gray"
                    onClick={() => onIndexChange((index + 1) % images.length)}
                  >
                    <ArrowLeftIcon style={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                </>
              )}
              <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" px={12}>
                {current && (
                  <Image
                    src={`/images/${current.filePath}`}
                    alt="Recipe image"
                    maxW="full"
                    maxH="full"
                    objectFit="contain"
                    borderRadius="md"
                  />
                )}
              </Box>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
