import { useMemo, useState } from 'react';
import {
  Badge, Box, Button, Flex, Grid, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react';
import { useParams, Link } from 'react-router-dom';
import { useCollection, useRemoveRecipeFromCollection } from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ShareCollectionPanel } from '../components/collection/ShareCollectionPanel';

export default function CollectionView() {
  const { id } = useParams<{ id: string }>();
  const { data: collection, isLoading } = useCollection(id!);
  const { user } = useAuthStore();
  const removeRecipe = useRemoveRecipeFromCollection();
  const [search, setSearch] = useState('');
  const [adderFilter, setAdderFilter] = useState<string | null>(null);

  const adders = useMemo(() => {
    const map = new Map<string, string>();
    collection?.recipes?.forEach((rc) => {
      if (rc.addedBy) map.set(rc.addedBy.id, rc.addedBy.username);
    });
    return Array.from(map.entries()).map(([uid, username]) => ({ id: uid, username }));
  }, [collection?.recipes]);

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (!collection) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">Collection not found.</Text>
      </Box>
    );
  }

  const myMembership = collection.members.find((m) => m.userId === user?.id);
  const isOwner = myMembership?.role === 'OWNER';

  const filteredRecipes = (collection.recipes ?? []).filter((rc) => {
    const matchesSearch = !search || rc.recipe?.title.toLowerCase().includes(search.toLowerCase());
    const matchesAdder = !adderFilter || rc.addedById === adderFilter;
    return matchesSearch && matchesAdder;
  });

  return (
    <Box py={4}>
      <Flex justify="space-between" mb={6} align="start" direction={{ base: 'column', sm: 'row' }} gap={3}>
        <VStack align="start" gap={1}>
          <Heading size="lg">{collection.name}</Heading>
          <Text fontSize="sm" color="gray.500">{collection.members.length} members</Text>
        </VStack>
        <HStack gap={2} align="start" flexWrap="wrap">
          {isOwner && (
            <ShareCollectionPanel
              collectionId={id!}
              members={collection.members}
              currentUserId={user!.id}
            />
          )}
          {isOwner && (
            <Link to={`/collections/${id}/edit`}>
              <Button size="sm" colorPalette="green" variant="outline">Manage Collection</Button>
            </Link>
          )}
        </HStack>
      </Flex>

      {/* Search + adder filter */}
      <VStack align="start" gap={3} mb={6}>
        <Input
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w="full"
          maxW="400px"
        />
        {adders.length > 1 && (
          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="sm" color="gray.500">Added by:</Text>
            <Badge
              cursor="pointer"
              colorPalette={adderFilter === null ? 'green' : 'gray'}
              variant={adderFilter === null ? 'solid' : 'outline'}
              onClick={() => setAdderFilter(null)}
            >
              All
            </Badge>
            {adders.map((a) => (
              <Badge
                key={a.id}
                cursor="pointer"
                colorPalette={adderFilter === a.id ? 'green' : 'gray'}
                variant={adderFilter === a.id ? 'solid' : 'outline'}
                onClick={() => setAdderFilter(adderFilter === a.id ? null : a.id)}
              >
                {a.username}
              </Badge>
            ))}
          </HStack>
        )}
      </VStack>

      {filteredRecipes.length > 0 ? (
        <Grid
          templateColumns={{ base: 'repeat(auto-fill, minmax(150px, 1fr))', md: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          gap={{ base: 3, md: 4 }}
        >
          {filteredRecipes.map((rc) => {
            if (!rc.recipe) return null;
            const canRemove = isOwner || rc.addedById === user?.id;
            return (
              <RecipeCard
                key={rc.id}
                recipe={rc.recipe}
                addedBy={rc.addedBy?.username ?? '—'}
                onRemove={canRemove ? () => removeRecipe.mutate({ id: id!, recipeId: rc.recipeId }) : undefined}
                isRemoving={removeRecipe.isPending && (removeRecipe.variables as { recipeId: string })?.recipeId === rc.recipeId}
              />
            );
          })}
        </Grid>
      ) : (
        <Box textAlign="center" py={12}>
          <Text color="gray.500">
            {search || adderFilter ? 'No recipes match your filters.' : 'No recipes in this collection yet.'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
