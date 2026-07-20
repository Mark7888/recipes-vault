import { useState } from 'react';
import { Box, Button, Heading, HStack, Input, VStack, Text } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCaptureRecipe, useCreateRecipe } from '../hooks/useRecipes';

export default function AddRecipe() {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(searchParams.get('url') ?? '');
  const navigate = useNavigate();
  const capture = useCaptureRecipe();
  const createRecipe = useCreateRecipe();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await capture.mutateAsync(url);
      navigate(`/recipes/${result.recipeId}/edit`);
    } catch {
      // error shown below
    }
  };

  const handleCreateEmpty = async () => {
    try {
      const recipe = await createRecipe.mutateAsync(undefined);
      navigate(`/recipes/${recipe.id}/edit`);
    } catch {
      // error shown below
    }
  };

  return (
    <Box maxW="600px" mx="auto" py={8}>
      <VStack align="start" gap={6}>
        <Heading size="lg">Add New Recipe</Heading>
        <Text color="fg.muted">
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
              <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
                <Text color="fg.error" fontSize="sm">
                  {(capture.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to capture recipe. Please try again.'}
                </Text>
              </Box>
            )}
            <Button type="submit" colorPalette="green" w="full" loading={capture.isPending}>
              {capture.isPending ? 'Fetching recipe...' : 'Capture Recipe'}
            </Button>
          </VStack>
        </form>
        <HStack w="full" gap={3}>
          <Box flex="1" borderTopWidth="1px" />
          <Text fontSize="sm" color="fg.muted">or</Text>
          <Box flex="1" borderTopWidth="1px" />
        </HStack>
        {createRecipe.isError && (
          <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
            <Text color="fg.error" fontSize="sm">Failed to create recipe. Please try again.</Text>
          </Box>
        )}
        <Button
          variant="outline"
          colorPalette="green"
          w="full"
          onClick={handleCreateEmpty}
          loading={createRecipe.isPending}
        >
          Start with an empty recipe
        </Button>
      </VStack>
    </Box>
  );
}
