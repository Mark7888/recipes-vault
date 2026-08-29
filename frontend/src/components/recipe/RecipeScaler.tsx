import { Button, HStack, Input, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { formatScale } from '../../utils/amounts';

const PRESETS = [0.5, 1, 2, 3];

interface Props {
  scale: number;
  onChange: (scale: number) => void;
}

/**
 * Multiplier for a recipe's amounts. The presets cover what people usually
 * cook; the box next to them takes anything else ("1.5", "10"). Clearing the
 * box goes back to the recipe as written.
 */
export function RecipeScaler({ scale, onChange }: Props) {
  // Kept as text while typing, so a half-typed "1." or "0," is not read as a
  // scale of its own and the field never rewrites what is being typed.
  const [custom, setCustom] = useState('');
  const parsedCustom = Number(custom.trim().replace(',', '.'));
  const customInvalid = custom.trim() !== '' && !(Number.isFinite(parsedCustom) && parsedCustom > 0);

  const pickPreset = (value: number) => {
    setCustom('');
    onChange(value);
  };

  const typeCustom = (raw: string) => {
    setCustom(raw);
    if (raw.trim() === '') { onChange(1); return; }
    const value = Number(raw.trim().replace(',', '.'));
    if (Number.isFinite(value) && value > 0) onChange(value);
  };

  return (
    <HStack gap={2} flexWrap="wrap">
      <Text fontSize="sm" color="fg.muted">Make</Text>
      <HStack gap={1}>
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            size="xs"
            colorPalette="green"
            variant={scale === preset ? 'solid' : 'outline'}
            onClick={() => pickPreset(preset)}
          >
            {formatScale(preset)}×
          </Button>
        ))}
      </HStack>
      <Input
        size="xs"
        w="70px"
        flexShrink={0}
        inputMode="decimal"
        placeholder="10×"
        aria-label="Custom amount multiplier"
        borderColor={customInvalid ? 'border.error' : undefined}
        value={custom}
        onChange={(e) => typeCustom(e.target.value)}
      />
    </HStack>
  );
}
