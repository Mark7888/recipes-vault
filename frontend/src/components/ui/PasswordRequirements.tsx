import { HStack, VStack, Text } from '@chakra-ui/react';
import { PASSWORD_RULES } from '../../utils/password';
import { CheckIcon, CloseIcon } from './icons';

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <VStack align="start" gap={0.5}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <HStack key={rule.label} gap={1.5} color={met ? 'green.600' : 'gray.400'}>
            {met ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
            <Text fontSize="xs">{rule.label}</Text>
          </HStack>
        );
      })}
    </VStack>
  );
}
