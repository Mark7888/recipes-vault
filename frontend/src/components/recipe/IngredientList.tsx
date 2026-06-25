import { VStack, HStack, Text, Box } from '@chakra-ui/react';
import { useState } from 'react';
import type { Ingredient } from '../../types';

interface Props {
  ingredients: Ingredient[];
}

export function IngredientList({ ingredients }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (ingredients.length === 0) {
    return <Text color="gray.500">No ingredients listed.</Text>;
  }

  return (
    <VStack align="start" gap={2}>
      {ingredients.map((ing, i) => (
        <HStack key={i} gap={3} cursor="pointer" onClick={() => toggle(i)}>
          <Box
            w="16px"
            h="16px"
            borderWidth="2px"
            borderRadius="sm"
            borderColor={checked.has(i) ? 'green.500' : 'gray.300'}
            bg={checked.has(i) ? 'green.500' : 'white'}
            flexShrink={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {checked.has(i) && (
              <Text fontSize="10px" color="white" fontWeight="bold">✓</Text>
            )}
          </Box>
          <Text
            textDecoration={checked.has(i) ? 'line-through' : 'none'}
            color={checked.has(i) ? 'gray.400' : 'gray.800'}
          >
            {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
