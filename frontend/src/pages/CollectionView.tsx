import { useMemo, useState } from 'react';
import {
  Badge, Box, Button, Flex, Grid, Heading, HStack, Input, Spinner, Text, VStack,
} from '@chakra-ui/react';
import { useParams, Link } from 'react-router-dom';
import {
  useCollection, useRemoveRecipeFromCollection, useAcceptTransfer, useRejectTransfer,
} from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ShareCollectionPanel } from '../components/collection/ShareCollectionPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const ADDERS_VISIBLE_LIMIT = 8;

export default function CollectionView() {
  const { id } = useParams<{ id: string }>();
  const { data: collection, isLoading } = useCollection(id!);
  const { user } = useAuthStore();
  const removeRecipe = useRemoveRecipeFromCollection();
  const acceptTransfer = useAcceptTransfer();
  const rejectTransfer = useRejectTransfer();
  const [search, setSearch] = useState('');
  const [adderFilter, setAdderFilter] = useState<string | null>(null);
  const [showAllAdders, setShowAllAdders] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

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
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">Collection not found.</Text>
      </Box>
    );
  }

  const myMembership = collection.members.find((m) => m.userId === user?.id);
  const isOwner = myMembership?.role === 'OWNER';
  const incomingTransfer = collection.pendingTransfer?.toUser.id === user?.id ? collection.pendingTransfer : undefined;

  const handleReject = async () => {
    await rejectTransfer.mutateAsync(id!);
    setConfirmReject(false);
  };

  const filteredRecipes = (collection.recipes ?? []).filter((rc) => {
    const matchesSearch = !search || rc.recipe?.title.toLowerCase().includes(search.toLowerCase());
    const matchesAdder = !adderFilter || rc.addedById === adderFilter;
    return matchesSearch && matchesAdder;
  });

  return (
    <Box py={4}>
      <Flex justify="space-between" mb={6} align="start" direction={{ base: 'column', sm: 'row' }} gap={3}>
        <VStack align="start" gap={1}>
          <HStack gap={2}>
            <Heading size="lg">{collection.name}</Heading>
            {collection.pendingTransfer && (
              <Badge colorPalette="orange" size="sm">Transfer pending</Badge>
            )}
          </HStack>
          <Text fontSize="sm" color="fg.muted">{collection.members.length} members</Text>
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

      {incomingTransfer && (
        <HStack
          w="full"
          justify="space-between"
          p={3}
          mb={6}
          bg="bg.warning"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border.warning"
          flexWrap="wrap"
          gap={2}
        >
          <Text color="fg.warning" fontSize="sm">
            {incomingTransfer.fromUser.username} wants to transfer ownership of this collection to you.
          </Text>
          <HStack gap={2} flexShrink={0}>
            <Button
              size="xs"
              colorPalette="green"
              loading={acceptTransfer.isPending}
              onClick={() => acceptTransfer.mutate(id!)}
            >
              Accept
            </Button>
            <Button
              size="xs"
              variant="outline"
              colorPalette="red"
              onClick={() => setConfirmReject(true)}
            >
              Reject
            </Button>
          </HStack>
        </HStack>
      )}
      <ConfirmDialog
        open={confirmReject}
        title="Reject transfer?"
        message={`You'll decline ownership of "${collection.name}". ${incomingTransfer?.fromUser.username ?? 'The current owner'} will remain the Owner.`}
        confirmLabel="Reject"
        loading={rejectTransfer.isPending}
        onConfirm={handleReject}
        onCancel={() => setConfirmReject(false)}
      />

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
            <Text fontSize="sm" color="fg.muted">Added by:</Text>
            <Badge
              cursor="pointer"
              colorPalette={adderFilter === null ? 'green' : 'gray'}
              variant={adderFilter === null ? 'solid' : 'outline'}
              onClick={() => setAdderFilter(null)}
            >
              All
            </Badge>
            {(showAllAdders ? adders : adders.slice(0, ADDERS_VISIBLE_LIMIT)).map((a) => (
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
            {!showAllAdders && adders.length > ADDERS_VISIBLE_LIMIT && (
              <Badge cursor="pointer" colorPalette="gray" variant="subtle" onClick={() => setShowAllAdders(true)}>
                +{adders.length - ADDERS_VISIBLE_LIMIT} more
              </Badge>
            )}
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
          <Text color="fg.muted">
            {search || adderFilter ? 'No recipes match your filters.' : 'No recipes in this collection yet.'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
