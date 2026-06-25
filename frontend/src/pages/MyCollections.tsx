import { useState } from 'react';
import {
  Box, Button, Grid, GridItem, Heading, HStack, Input, Spinner, Tabs, Text, VStack
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useCollections, useCreateCollection } from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { RoleBadge } from '../components/collection/RoleBadge';

function CollectionGrid({ collections, userId }: { collections: ReturnType<typeof useCollections>['data']; userId: string }) {
  if (!collections || collections.length === 0) return null;
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={4}>
      {collections.map((collection) => {
        const myRole = collection.members.find((m) => m.userId === userId)?.role;
        return (
          <GridItem key={collection.id}>
            <Link to={`/collections/${collection.id}`} style={{ display: 'block', textDecoration: 'none' }}>
              <Box
                borderWidth="1px"
                borderRadius="lg"
                p={4}
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                bg="white"
                h="full"
              >
                <VStack align="start" gap={2}>
                  <Heading size="sm">{collection.name}</Heading>
                  <Text fontSize="sm" color="gray.500">{collection._count?.recipes ?? 0} recipes</Text>
                  <HStack gap={2}>
                    {myRole && <RoleBadge role={myRole} />}
                    <Text fontSize="sm" color="gray.400">{collection.members.length} members</Text>
                  </HStack>
                </VStack>
              </Box>
            </Link>
          </GridItem>
        );
      })}
    </Grid>
  );
}

export default function Collections() {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const { user } = useAuthStore();

  const owned = collections?.filter((c) => c.members.some((m) => m.userId === user?.id && m.role === 'OWNER'));
  const shared = collections?.filter((c) => c.members.some((m) => m.userId === user?.id && m.role !== 'OWNER'));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createCollection.mutateAsync(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  return (
    <Box py={4}>
      <Tabs.Root defaultValue="owned" variant="line">
        <HStack justify="space-between" mb={4} align="center">
          <Tabs.List>
            <Tabs.Trigger value="owned">
              My Collections {owned ? `(${owned.length})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="shared">
              Shared with me {shared ? `(${shared.length})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
          <Button colorPalette="green" size="sm" onClick={() => setShowCreate((v) => !v)}>
            + New Collection
          </Button>
        </HStack>

        {showCreate && (
          <Box mb={6} p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
            <form onSubmit={handleCreate}>
              <HStack gap={2}>
                <Input
                  placeholder="Collection name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" colorPalette="green" loading={createCollection.isPending}>Create</Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </HStack>
            </form>
          </Box>
        )}

        {isLoading ? (
          <Box textAlign="center" py={12}><Spinner size="xl" /></Box>
        ) : (
          <>
            <Tabs.Content value="owned">
              {owned && owned.length > 0 ? (
                <CollectionGrid collections={owned} userId={user!.id} />
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="gray.500">No collections yet. Create your first one!</Text>
                </Box>
              )}
            </Tabs.Content>

            <Tabs.Content value="shared">
              {shared && shared.length > 0 ? (
                <CollectionGrid collections={shared} userId={user!.id} />
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="gray.500">No collections have been shared with you yet.</Text>
                </Box>
              )}
            </Tabs.Content>
          </>
        )}
      </Tabs.Root>
    </Box>
  );
}
