import {
  Box, Button, Flex, Heading, HStack, Input, Text, VStack, Badge, Spinner
} from '@chakra-ui/react';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipe, useDeleteRecipe, useDuplicateRecipe } from '../hooks/useRecipes';
import { recipesApi } from '../api/recipes.api';
import { useAuthStore } from '../store/authStore';
import { IngredientList } from '../components/recipe/IngredientList';
import { useAddShoppingItems } from '../hooks/useShoppingList';
import { StepList } from '../components/recipe/StepList';
import { AddToCollectionPanel } from '../components/recipe/AddToCollectionPanel';
import { ImageGallery } from '../components/recipe/ImageGallery';
import { RecipeOriginBadge } from '../components/recipe/RecipeOriginBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CartIcon, CheckIcon, CopyIcon, EditIcon, ExternalLinkIcon, ShareIcon } from '../components/ui/icons';

export default function RecipeView() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading, isError } = useRecipe(id!);
  const deleteRecipe = useDeleteRecipe();
  const duplicateRecipe = useDuplicateRecipe();
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
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">Recipe not found.</Text>
      </Box>
    );
  }

  const isOwner = recipe.ownerId === user?.id;

  const handleDelete = async () => {
    await deleteRecipe.mutateAsync(recipe.id);
    setConfirmDelete(false);
    navigate('/recipes');
  };

  const handleDuplicate = async () => {
    const copy = await duplicateRecipe.mutateAsync(recipe.id);
    navigate(`/recipes/${copy.id}/edit`);
  };

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        <ImageGallery images={recipe.images ?? []} coverImageId={recipe.coverImageId} title={recipe.title} />
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
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Original recipe</span>
                  <ExternalLinkIcon size={12} />
                </a>
              </Text>
            )}
            <RecipeOriginBadge origin={recipe.origin} />
          </VStack>
          {isOwner && (
            // wraps so the four actions never push the page wider than a phone
            <HStack gap={2} flexWrap="wrap">
              <Button size="sm" colorPalette="blue" variant="outline" onClick={handleShare}>
                <ShareIcon size={14} /> Share
              </Button>
              <Button size="sm" colorPalette="blue" variant="outline" loading={duplicateRecipe.isPending} onClick={handleDuplicate}>
                <CopyIcon size={14} /> Duplicate
              </Button>
              <Link to={`/recipes/${recipe.id}/edit`}>
                <Button size="sm" colorPalette="green" variant="outline"><EditIcon size={14} /> Edit</Button>
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
          <Box w="full" p={3} bg="blue.subtle" borderRadius="md" borderWidth="1px" borderColor="blue.muted">
            <Text fontSize="sm" mb={2} color="blue.fg">Anyone with this link can view the recipe, no login needed:</Text>
            <HStack gap={2}>
              <Input
                size="sm"
                bg="bg.panel"
                color="fg"
                minW={0}
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="sm" colorPalette="blue" flexShrink={0} onClick={() => void copyShareUrl(shareUrl)}>
                {shareCopied ? 'Copied!' : 'Copy'}
              </Button>
            </HStack>
          </Box>
        )}

        <AddToCollectionPanel recipeId={recipe.id} />

        <HStack gap={4} color="fg.muted" fontSize="sm" flexWrap="wrap">
          {recipe.prepTime && <Text>{recipe.prepTime} min prep</Text>}
          {recipe.cookTime && <Text>{recipe.cookTime} min cook</Text>}
          {recipe.servings && <Text>{recipe.servings} servings</Text>}
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
                <Text fontSize="xs" color="fg.muted">
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
                  {addedToList ? <><CheckIcon size={14} /> Added to shopping list</> : <><CartIcon size={14} /> Add {missing.length} missing to shopping list</>}
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
