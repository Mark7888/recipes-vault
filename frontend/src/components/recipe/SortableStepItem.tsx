import { Box, Button, HStack, Textarea } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Instruction } from '../../types';

interface Props {
  id: string;
  instruction: Instruction;
  onChange: (text: string) => void;
  onRemove: () => void;
}

export function SortableStepItem({ id, instruction, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <HStack
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      align="start"
      gap={2}
      w="full"
      bg={isDragging ? 'gray.50' : undefined}
      opacity={isDragging ? 0.5 : 1}
      zIndex={isDragging ? 1 : undefined}
      position="relative"
    >
      <Box
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder step"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        color="gray.400"
        fontSize="md"
        mt={1}
        px={1}
        userSelect="none"
        flexShrink={0}
      >
        ⠿
      </Box>
      <Box
        minW="28px"
        h="28px"
        borderRadius="full"
        bg="green.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="bold"
        mt={1}
        flexShrink={0}
      >
        {instruction.step}
      </Box>
      <Textarea
        value={instruction.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Step ${instruction.step}...`}
        flex="1"
        size="sm"
        rows={2}
      />
      <Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove} mt={1}>x</Button>
    </HStack>
  );
}
