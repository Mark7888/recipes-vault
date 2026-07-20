import { Box } from '@chakra-ui/react';
import { CheckIcon } from './icons';

interface Props {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export function Checkbox({ checked, onToggle, size = 18 }: Props) {
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderWidth="2px"
      borderRadius="sm"
      borderColor={checked ? 'green.500' : 'gray.300'}
      bg={checked ? 'green.500' : 'white'}
      color="white"
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {checked && <CheckIcon size={Math.round(size * 0.65)} strokeWidth={3} />}
    </Box>
  );
}
