import { useState, useRef, useCallback } from 'react';
import { Box, HStack, Input, Text, VStack, Spinner } from '@chakra-ui/react';
import { useTags } from '../../hooks/useTags';
import { CloseIcon } from '../ui/icons';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = 'Add tags...' }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: suggestions, isLoading } = useTags(inputValue);

  const addTag = useCallback((tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter((t) => t !== tag));
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Box position="relative">
      <Box
        borderWidth="1px"
        borderRadius="md"
        p={2}
        minH="40px"
        cursor="text"
        onClick={() => inputRef.current?.focus()}
      >
        <HStack flexWrap="wrap" gap={1}>
          {value.map((tag) => (
            <Box
              key={tag}
              display="inline-flex"
              alignItems="center"
              gap={1}
              bg="green.100"
              color="green.800"
              px={2}
              py={0.5}
              borderRadius="md"
              fontSize="sm"
            >
              <Text>{tag}</Text>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                style={{ cursor: 'pointer', color: 'inherit', background: 'none', border: 'none', padding: 0, lineHeight: 1, marginLeft: '4px', display: 'inline-flex' }}
              >
                <CloseIcon size={10} />
              </button>
            </Box>
          ))}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            border="none"
            outline="none"
            p={0}
            h="auto"
            minW="100px"
            flex="1"
            size="sm"
            placeholder={value.length === 0 ? placeholder : ''}
            css={{ boxShadow: 'none !important' }}
          />
        </HStack>
      </Box>
      {showSuggestions && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={10}
          bg="white"
          borderWidth="1px"
          borderRadius="md"
          shadow="md"
          maxH="200px"
          overflowY="auto"
          mt={1}
        >
          {isLoading ? (
            <HStack p={3} justify="center"><Spinner size="sm" /></HStack>
          ) : suggestions && suggestions.length > 0 ? (
            <VStack align="start" gap={0}>
              {suggestions.map((tag) => (
                <Box
                  key={tag.id}
                  w="full"
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: 'gray.50' }}
                  onMouseDown={() => addTag(tag.name)}
                >
                  <Text fontSize="sm">{tag.name}</Text>
                </Box>
              ))}
            </VStack>
          ) : inputValue ? (
            <Box
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onMouseDown={() => addTag(inputValue)}
            >
              <Text fontSize="sm" color="gray.500">Create tag "{inputValue}"</Text>
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
