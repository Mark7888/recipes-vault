import { Box, Button, HStack, Input } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CloseIcon, DragHandleIcon } from '../ui/icons';

interface Props {
  id: string;
  title: string;
  /** "ingredient" or "step" — only used in the labels. */
  kind: string;
  onChange: (title: string) => void;
  onRemove: () => void;
}

/**
 * A section heading row. It drags like any other row in the list, and where it
 * lands is what decides which rows fall under it.
 */
export function SortableSectionItem({ id, title, kind, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <HStack
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      gap={2}
      w="full"
      bg={isDragging ? 'bg.subtle' : 'bg.muted'}
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor="green.500"
      px={2}
      py={1}
      opacity={isDragging ? 0.5 : 1}
      zIndex={isDragging ? 1 : undefined}
      position="relative"
    >
      <Box
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        aria-label={`Drag to reorder ${kind} section`}
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        color="fg.subtle"
        display="flex"
        flexShrink={0}
      >
        <DragHandleIcon size={18} />
      </Box>
      <Input
        placeholder="Section title, e.g. For the bun"
        aria-label={`${kind} section title`}
        value={title}
        onChange={(e) => onChange(e.target.value)}
        flex="1"
        size="sm"
        fontWeight="semibold"
        variant="flushed"
      />
      <Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove} aria-label="Remove section">
        <CloseIcon size={14} />
      </Button>
    </HStack>
  );
}
