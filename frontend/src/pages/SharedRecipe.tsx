import {
  Box, Flex, Heading, HStack, Text, VStack, Badge, Spinner
} from '@chakra-ui/react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSharedRecipe } from '../hooks/useRecipes';
import { IngredientList } from '../components/recipe/IngredientList';
import { RecipeScaler } from '../components/recipe/RecipeScaler';
import { StepList } from '../components/recipe/StepList';
import { ImageGallery } from '../components/recipe/ImageGallery';
import { formatAmount, formatScale } from '../utils/amounts';
import { ExternalLinkIcon } from '../components/ui/icons';

export default function SharedRecipe() {
  const { token } = useParams<{ token: string }>();
  const { data: recipe, isLoading, isError } = useSharedRecipe(token!);
  // Scaling is a reader's tool, so it works without an account too.
  const [scale, setScale] = useState(1);

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (isError || !recipe) {
    return (
      <Box maxW="800px" mx="auto" p={8}>
        <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
          <Text color="fg.error">This shared recipe link is invalid.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box maxW="800px" mx="auto" py={6} px={4}>
      <VStack align="start" gap={6}>
        <ImageGallery images={recipe.images ?? []} coverImageId={recipe.coverImageId} title={recipe.title} />
        <VStack align="start" gap={1}>
          <Heading size="xl">{recipe.title}</Heading>
          {recipe.owner && (
            <Text fontSize="sm" color="fg.muted">Shared by {recipe.owner.username}</Text>
          )}
          {recipe.sourceUrl && (
            <Text fontSize="sm" color="blue.500">
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>Original recipe</span>
                <ExternalLinkIcon size={12} />
              </a>
            </Text>
          )}
        </VStack>

        <HStack gap={4} color="fg.muted" fontSize="sm" flexWrap="wrap">
          {recipe.prepTime && <Text>{recipe.prepTime} min prep</Text>}
          {recipe.cookTime && <Text>{recipe.cookTime} min cook</Text>}
          {recipe.servings && (
            <Text color={scale === 1 ? undefined : 'green.fg'}>
              {formatAmount(recipe.servings * scale)} servings
              {scale !== 1 && ` (${formatScale(scale)}× of ${recipe.servings})`}
            </Text>
          )}
        </HStack>

        <HStack w="full" flexWrap="wrap" gap={2}>
          {recipe.tags.map((tag) => (
            <Badge key={tag.id} colorPalette="green" maxW="full" overflow="hidden" title={tag.name}><Box as="span" truncate>{tag.name}</Box></Badge>
          ))}
        </HStack>

        {recipe.notes && (
          <Box bg="yellow.subtle" p={4} borderRadius="md" borderLeftWidth="4px" borderLeftColor="yellow.border">
            <Text color="yellow.fg">{recipe.notes}</Text>
          </Box>
        )}

        <Box w="full" borderTopWidth="1px" pt={6}>
          <Flex justify="space-between" align="center" mb={4} gap={3} flexWrap="wrap">
            <Heading size="md">Ingredients</Heading>
            <RecipeScaler scale={scale} onChange={setScale} />
          </Flex>
          <IngredientList ingredients={recipe.ingredients} scale={scale} />
        </Box>

        <Box w="full" borderTopWidth="1px" pt={6}>
          <Heading size="md" mb={4}>Instructions</Heading>
          <StepList instructions={recipe.instructions} />
        </Box>
      </VStack>
    </Box>
  );
}
