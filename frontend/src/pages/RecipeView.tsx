import {
  Box, Button, Flex, Heading, HStack, Input, Text, VStack, Badge, Spinner, Image
} from '@chakra-ui/react';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '../hooks/useRecipes';
import { recipesApi } from '../api/recipes.api';
import { useAuthStore } from '../store/authStore';
import { IngredientList } from '../components/recipe/IngredientList';
import { useAddShoppingItems } from '../hooks/useShoppingList';
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
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  // Ingredients checked as "already have at home" — the rest go to the shopping list
  const [haveAtHome, setHaveAtHome] = useState<Set<number>>(new Set());
  const [addedToList, setAddedToList] = useState(false);
  const addShoppingItems = useAddShoppingItems();

  const toggleHaveAtHome = (i: number) => {
    setHaveAtHome((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setAddedToList(false);
  };

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http origin, permissions) — the visible link
      // input below is the fallback.
    }
  };

  const handleShare = async () => {
    if (shareUrl) { setShareUrl(null); return; }
    const { token } = await recipesApi.share(id!);
    const url = `${window.location.origin}/shared/${token}`;
    setShareUrl(url);
    void copyShareUrl(url);
  };

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
              <Button size="sm" colorPalette="blue" variant="outline" onClick={handleShare}>
                🔗 Share
              </Button>
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

        {shareUrl && (
          <Box w="full" p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
            <Text fontSize="sm" mb={2}>Anyone with this link can view the recipe, no login needed:</Text>
            <HStack gap={2}>
              <Input
                size="sm"
                bg="white"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="sm" colorPalette="blue" onClick={() => void copyShareUrl(shareUrl)}>
                {shareCopied ? 'Copied!' : 'Copy'}
              </Button>
            </HStack>
          </Box>
        )}

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
          <IngredientList ingredients={recipe.ingredients} checked={haveAtHome} onToggle={toggleHaveAtHome} />
          {recipe.ingredients.length > 0 && (() => {
            const missing = recipe.ingredients.filter((_, i) => !haveAtHome.has(i));
            const handleAddToShoppingList = async () => {
              await addShoppingItems.mutateAsync(
                missing.map((ing) => ({
                  name: ing.name,
                  amount: ing.amount,
                  unit: ing.unit,
                  recipeId: recipe.id,
                }))
              );
              setAddedToList(true);
            };
            return (
              <VStack align="start" gap={1} mt={4}>
                <Text fontSize="xs" color="gray.500">
                  Check what you already have at home, then add the rest to your shopping list.
                </Text>
                <Button
                  size="sm"
                  colorPalette="green"
                  variant="outline"
                  disabled={missing.length === 0 || addedToList}
                  loading={addShoppingItems.isPending}
                  onClick={handleAddToShoppingList}
                >
                  {addedToList ? '✓ Added to shopping list' : `🛒 Add ${missing.length} missing to shopping list`}
                </Button>
              </VStack>
            );
          })()}
        </Box>

        <Box w="full" borderTopWidth="1px" pt={6}>
          <Heading size="md" mb={4}>Instructions</Heading>
          <StepList instructions={recipe.instructions} />
        </Box>
      </VStack>
    </Box>
  );
}
