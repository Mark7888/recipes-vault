import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import type { InstructionEntry } from '../../types';
import { isSection } from '../../utils/sections';

interface Props {
  instructions: InstructionEntry[];
}

export function StepList({ instructions }: Props) {
  if (instructions.length === 0) {
    return <Text color="fg.muted">No instructions listed.</Text>;
  }

  return (
    <VStack align="start" gap={4}>
      {instructions.map((entry, i) =>
        isSection(entry) ? (
          <Text
            key={i}
            fontWeight="semibold"
            fontSize="sm"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
          >
            {entry.title}
          </Text>
        ) : (
          <HStack key={i} align="start" gap={3}>
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
              {entry.step}
            </Box>
            <Text mt={1}>{entry.text}</Text>
          </HStack>
        )
      )}
    </VStack>
  );
}
