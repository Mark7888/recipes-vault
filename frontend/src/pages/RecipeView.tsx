import {
  Box, Button, Heading, HStack, Text, VStack, Badge, Spinner, Image
} from '@chakra-ui/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks/useRecipes';
import { useAuthStore } from '../store/authStore';
import { IngredientList } from '../components/recipe/IngredientList';
import { StepList } from '../components/recipe/StepList';
import { AddToCollectionPanel } from '../components/recipe/AddToCollectionPanel';

export default function RecipeView() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, isError } = useRecipe(id!);
  const deleteRecipe = useDeleteRecipe();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (isError || !recipe) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">Recipe not found.</Text>
      </Box>
    );
  }

  const isOwner = recipe.ownerId === user?.id;
  const coverUrl = recipe.coverImage ? `/images/${recipe.coverImage.filePath}` : null;

  const handleDelete = async () => {
    if (!window.confirm('Delete this recipe?')) return;
    await deleteRecipe.mutateAsync(recipe.id);
    navigate('/recipes');
  };

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        {coverUrl && (
          <Image src={coverUrl} alt={recipe.title} w="full" maxH="400px" objectFit="cover" borderRadius="xl" />
        )}
        <HStack justify="space-between" w="full" align="start">
          <VStack align="start" gap={1}>
            <Heading size="xl">{recipe.title}</Heading>
            {recipe.sourceUrl && (
              <Text fontSize="sm" color="blue.500">
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">Original recipe ↗</a>
              </Text>
            )}
            {recipe.isFallback && (
              <Badge colorPalette="orange">Manually captured</Badge>
            )}
          </VStack>
          {isOwner && (
            <HStack gap={2}>
              <Link to={`/recipes/${recipe.id}/edit`}>
                <Button size="sm" colorPalette="green" variant="outline">✏️ Edit</Button>
              </Link>
              <Button size="sm" colorPalette="red" variant="ghost" onClick={handleDelete} loading={deleteRecipe.isPending}>
                Delete
              </Button>
            </HStack>
          )}
        </HStack>

        <AddToCollectionPanel recipeId={recipe.id} />

        <HStack gap={4} color="gray.600" fontSize="sm">
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
