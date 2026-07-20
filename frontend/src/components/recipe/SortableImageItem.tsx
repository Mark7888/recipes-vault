import { Box, Button, VStack, Badge, Image, GridItem } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Image as RecipeImage } from '../../types';
import { DragHandleIcon } from '../ui/icons';

interface Props {
  image: RecipeImage;
  isCover: boolean;
  onOpen: () => void;
  onSetCover: () => void;
  onRemove: () => void;
}

export function SortableImageItem({ image, isCover, onOpen, onSetCover, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  return (
    <GridItem
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      position="relative"
      opacity={isDragging ? 0.5 : 1}
      zIndex={isDragging ? 1 : undefined}
    >
      <Box
        borderRadius="md"
        overflow="hidden"
        borderWidth={isCover ? '2px' : '1px'}
        borderColor={isCover ? 'green.500' : 'border'}
        position="relative"
      >
        <Box
          {...attributes}
          {...listeners}
          position="absolute"
          top={1}
          left={1}
          zIndex={2}
          bg="blackAlpha.600"
          color="white"
          borderRadius="sm"
          p={0.5}
          style={{ touchAction: 'none' }}
          cursor="grab"
          _active={{ cursor: 'grabbing' }}
          aria-label="Drag to reorder image"
          display="flex"
        >
          <DragHandleIcon size={14} />
        </Box>
        <Image
          src={`/images/${image.filePath}`}
          alt="Recipe image"
          h="100px"
          w="full"
          objectFit="cover"
          cursor="pointer"
          onClick={onOpen}
        />
        <VStack gap={1} p={1}>
          {isCover ? (
            <Badge colorPalette="green" size="sm">Cover</Badge>
          ) : (
            <Button size="xs" variant="ghost" colorPalette="green" onClick={onSetCover}>
              Set cover
            </Button>
          )}
          <Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove}>
            Remove
          </Button>
        </VStack>
      </Box>
    </GridItem>
  );
}
