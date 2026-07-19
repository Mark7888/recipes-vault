import {
  Box, Heading, HStack, Text, VStack, Badge, Spinner, Image
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes.api';
import { IngredientList } from '../components/recipe/IngredientList';
import { StepList } from '../components/recipe/StepList';

export default function SharedRecipe() {
  const { token } = useParams<{ token: string }>();
  const { data: recipe, isLoading, isError } = useQuery({
    queryKey: ['shared-recipe', token],
    queryFn: () => recipesApi.getShared(token!),
    enabled: !!token,
    retry: false,
  });

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (isError || !recipe) {
    return (
      <Box maxW="800px" mx="auto" p={8}>
        <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <Text color="red.600">This shared recipe link is invalid.</Text>
        </Box>
      </Box>
    );
  }

  const coverUrl = recipe.coverImage ? `/images/${recipe.coverImage.filePath}` : null;

  return (
    <Box maxW="800px" mx="auto" py={6} px={4}>
      <VStack align="start" gap={6}>
        {coverUrl && (
          <Image src={coverUrl} alt={recipe.title} w="full" maxH={{ base: '240px', md: '400px' }} objectFit="cover" borderRadius="xl" />
        )}
        <VStack align="start" gap={1}>
          <Heading size="xl">{recipe.title}</Heading>
          {recipe.owner && (
            <Text fontSize="sm" color="gray.500">Shared by {recipe.owner.username}</Text>
          )}
          {recipe.sourceUrl && (
            <Text fontSize="sm" color="blue.500">
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">Original recipe ↗</a>
            </Text>
          )}
        </VStack>

        <HStack gap={4} color="gray.600" fontSize="sm" flexWrap="wrap">
          {recipe.prepTime && <Text>{recipe.prepTime} min prep</Text>}
          {recipe.cookTime && <Text>{recipe.cookTime} min cook</Text>}
          {recipe.servings && <Text>{recipe.servings} servings</Text>}
        </HStack>

        <HStack flexWrap="wrap" gap={2}>
          {recipe.tags.map((tag) => (
            <Badge key={tag.id} colorPalette="green">{tag.name}</Badge>
          ))}
        </HStack>

        {recipe.notes && (
          <Box bg="yellow.50" p={4} borderRadius="md" borderLeftWidth="4px" borderLeftColor="yellow.400">
            <Text>{recipe.notes}</Text>
          </Box>
        )}

        <Box w="full" borderTopWidth="1px" pt={6}>
          <Heading size="md" mb={4}>Ingredients</Heading>
          <IngredientList ingredients={recipe.ingredients} />
        </Box>

        <Box w="full" borderTopWidth="1px" pt={6}>
          <Heading size="md" mb={4}>Instructions</Heading>
          <StepList instructions={recipe.instructions} />
        </Box>
      </VStack>
    </Box>
  );
}
