import { VStack, HStack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import type { Ingredient } from '../../types';
import { Checkbox } from '../ui/Checkbox';

interface Props {
  ingredients: Ingredient[];
  // Optional controlled mode (RecipeView uses the checked state as "I have
  // this at home" for the shopping list); uncontrolled otherwise.
  checked?: Set<number>;
  onToggle?: (index: number) => void;
}

export function IngredientList({ ingredients, checked: checkedProp, onToggle }: Props) {
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
      {ingredients.map((ing, i) => (
        <HStack key={i} gap={3} cursor="pointer" onClick={() => toggle(i)}>
          <Checkbox checked={checked.has(i)} onToggle={() => toggle(i)} size={16} />
          <Text
            textDecoration={checked.has(i) ? 'line-through' : 'none'}
            color={checked.has(i) ? 'fg.subtle' : 'fg'}
          >
            {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
