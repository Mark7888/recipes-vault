import { VStack, HStack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import type { IngredientEntry } from '../../types';
import { isSection } from '../../utils/sections';
import { scaleAmount } from '../../utils/amounts';
import { Checkbox } from '../ui/Checkbox';

interface Props {
  ingredients: IngredientEntry[];
  // Optional controlled mode (RecipeView uses the checked state as "I have
  // this at home" for the shopping list); uncontrolled otherwise.
  // Indexes are into the entry list, section headings included, so they stay
  // valid however the recipe is grouped.
  checked?: Set<number>;
  onToggle?: (index: number) => void;
  // Multiplier the recipe is being cooked at; amounts are shown scaled by it.
  scale?: number;
}

export function IngredientList({ ingredients, checked: checkedProp, onToggle, scale = 1 }: Props) {
  const [internalChecked, setInternalChecked] = useState<Set<number>>(new Set());
  const checked = checkedProp ?? internalChecked;

  const toggle = (i: number) => {
    if (onToggle) { onToggle(i); return; }
    setInternalChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (ingredients.length === 0) {
    return <Text color="fg.muted">No ingredients listed.</Text>;
  }

  return (
    <VStack align="start" gap={2}>
      {ingredients.map((entry, i) =>
        isSection(entry) ? (
          <Text
            key={i}
            fontWeight="semibold"
            fontSize="sm"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
            pt={i === 0 ? 0 : 2}
          >
            {entry.title}
          </Text>
        ) : (
          <HStack key={i} gap={3} cursor="pointer" onClick={() => toggle(i)}>
            <Checkbox checked={checked.has(i)} onToggle={() => toggle(i)} size={16} />
            <Text
              textDecoration={checked.has(i) ? 'line-through' : 'none'}
              color={checked.has(i) ? 'fg.subtle' : 'fg'}
            >
              {[scaleAmount(entry.amount, scale), entry.unit, entry.name].filter(Boolean).join(' ')}
            </Text>
          </HStack>
        )
      )}
    </VStack>
  );
}
