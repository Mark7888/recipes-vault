import { Box, Button, HStack, Input } from '@chakra-ui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ingredient } from '../../types';
import { ArrowLeftIcon, CloseIcon, DragHandleIcon } from '../ui/icons';

interface Props {
  id: string;
  ingredient: Ingredient;
  onChange: (field: keyof Ingredient, value: string) => void;
  onSplit: () => void;
  onRemove: () => void;
}

export function SortableIngredientItem({ id, ingredient, onChange, onSplit, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const showSplit = ingredient.amount === '' && ingredient.name?.includes(' ');

  return (
    <HStack
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      gap={{ base: 1, sm: 2 }}
      w="full"
      bg={isDragging ? 'bg.subtle' : undefined}
      opacity={isDragging ? 0.5 : 1}
      zIndex={isDragging ? 1 : undefined}
      position="relative"
    >
      <Box
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder ingredient"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        color="fg.subtle"
        display="flex"
        flexShrink={0}
      >
        <DragHandleIcon size={18} />
      </Box>
      <Input
        placeholder="Amount"
        value={ingredient.amount}
        onChange={(e) => onChange('amount', e.target.value)}
        w={{ base: '56px', sm: '80px' }}
        size="sm"
      />
      <Input
        placeholder="Unit"
        value={ingredient.unit}
        onChange={(e) => onChange('unit', e.target.value)}
        w={{ base: '56px', sm: '80px' }}
        size="sm"
      />
      <Input
        placeholder="Ingredient name"
        value={ingredient.name}
        onChange={(e) => onChange('name', e.target.value)}
        flex="1"
        size="sm"
      />
      {showSplit && (
        <Button size="xs" variant="ghost" colorPalette="blue" onClick={onSplit} title="Auto-split into amount / unit / name">
          <ArrowLeftIcon size={14} />
        </Button>
      )}
      <Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove}>
        <CloseIcon size={14} />
      </Button>
    </HStack>
  );
}
