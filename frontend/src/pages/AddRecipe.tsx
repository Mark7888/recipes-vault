import { useState } from 'react';
import { Box, Button, Heading, Input, VStack, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useCaptureRecipe } from '../hooks/useRecipes';

export default function AddRecipe() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  const capture = useCaptureRecipe();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await capture.mutateAsync(url);
      navigate(`/recipes/${result.recipeId}/edit`);
    } catch {
      // error shown below
    }
  };

  return (
    <Box maxW="600px" mx="auto" py={8}>
      <VStack align="start" gap={6}>
        <Heading size="lg">Add New Recipe</Heading>
        <Text color="gray.600">
          Paste a recipe URL below to automatically extract the recipe details.
        </Text>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <VStack gap={4}>
            <Box w="full">
              <Text mb={1} fontWeight="medium" fontSize="sm">Recipe URL</Text>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe/..."
                type="url"
                required
              />
            </Box>
            {capture.isError && (
              <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                <Text color="red.600" fontSize="sm">
                  {(capture.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to capture recipe. Please try again.'}
                </Text>
              </Box>
            )}
            <Button type="submit" colorPalette="green" w="full" loading={capture.isPending}>
              {capture.isPending ? 'Fetching recipe...' : 'Capture Recipe'}
            </Button>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}
