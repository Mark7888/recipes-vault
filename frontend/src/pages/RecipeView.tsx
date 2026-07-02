import {
  Box, Button, Flex, Heading, HStack, Text, VStack, Badge, Spinner, Image
} from '@chakra-ui/react';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks/useRecipes';
import { useAuthStore } from '../store/authStore';
import { IngredientList } from '../components/recipe/IngredientList';
import { StepList } from '../components/recipe/StepList';
import { AddToCollectionPanel } from '../components/recipe/AddToCollectionPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export default function RecipeView() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, isError } = useRecipe(id!);
  const deleteRecipe = useDeleteRecipe();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    await deleteRecipe.mutateAsync(recipe.id);
    setConfirmDelete(false);
    navigate('/recipes');
  };

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        {coverUrl && (
          <Image src={coverUrl} alt={recipe.title} w="full" maxH={{ base: '240px', md: '400px' }} objectFit="cover" borderRadius="xl" />
        )}
        <Flex
          justify="space-between"
          w="full"
          align="start"
          direction={{ base: 'column', sm: 'row' }}
          gap={3}
        >
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
              <Button size="sm" colorPalette="red" variant="ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <ConfirmDialog
                open={confirmDelete}
                title="Delete recipe?"
                message={`"${recipe.title}" will be permanently deleted. This cannot be undone.`}
                loading={deleteRecipe.isPending}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(false)}
              />
            </HStack>
          )}
        </Flex>

        <AddToCollectionPanel recipeId={recipe.id} />

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
