import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import type { Instruction } from '../../types';

interface Props {
  instructions: Instruction[];
}

export function StepList({ instructions }: Props) {
  if (instructions.length === 0) {
    return <Text color="fg.muted">No instructions listed.</Text>;
  }

  return (
    <VStack align="start" gap={4}>
      {instructions.map((inst) => (
        <HStack key={inst.step} align="start" gap={3}>
          <Box
            minW="32px"
            h="32px"
            borderRadius="full"
            bg="green.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="bold"
            fontSize="sm"
            flexShrink={0}
          >
            {inst.step}
          </Box>
          <Text mt={1}>{inst.text}</Text>
        </HStack>
      ))}
    </VStack>
  );
}
