import { useState } from 'react';
import {
  Box, Badge, Button, Flex, Grid, GridItem, Heading, HStack, Input, Spinner, Tabs, Text, VStack
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import {
  useCollections, useCreateCollection, useIncomingTransfers, useAcceptTransfer, useRejectTransfer,
} from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { RoleBadge } from '../components/collection/RoleBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { IncomingTransfer } from '../types';

function CollectionGrid({ collections, userId }: { collections: ReturnType<typeof useCollections>['data']; userId: string }) {
  if (!collections || collections.length === 0) return null;
  return (
    <Grid
      templateColumns={{ base: 'repeat(auto-fill, minmax(150px, 1fr))', md: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      gap={{ base: 3, md: 4 }}
    >
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
                bg="bg.panel"
                h="full"
              >
                <VStack align="start" gap={2}>
                  <Heading size="sm">{collection.name}</Heading>
                  <Text fontSize="sm" color="fg.muted">{collection._count?.recipes ?? 0} recipes</Text>
                  <HStack gap={2} flexWrap="wrap">
                    {collection.isDefault && <Badge colorPalette="purple" size="sm">Recipe book</Badge>}
                    {myRole && <RoleBadge role={myRole} />}
                    <Text fontSize="sm" color="fg.subtle">{collection.members.length} members</Text>
                  </HStack>
                  {collection.pendingTransfer && (
                    <Badge colorPalette="orange" size="sm">Transfer pending</Badge>
                  )}
                </VStack>
              </Box>
            </Link>
          </GridItem>
        );
      })}
    </Grid>
  );
}

function PendingTransferCard({ transfer }: { transfer: IncomingTransfer }) {
  const acceptTransfer = useAcceptTransfer();
  const rejectTransfer = useRejectTransfer();
  const [confirmReject, setConfirmReject] = useState(false);

  const handleReject = async () => {
    await rejectTransfer.mutateAsync(transfer.collection.id);
    setConfirmReject(false);
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
      <VStack align="start" gap={2}>
        <Heading size="sm">{transfer.collection.name}</Heading>
        <Text fontSize="sm" color="fg.muted">
          {transfer.collection._count?.recipes ?? 0} recipes · from {transfer.fromUser.username}
        </Text>
        <HStack gap={2} pt={1}>
          <Button
            size="sm"
            colorPalette="green"
            loading={acceptTransfer.isPending}
            onClick={() => acceptTransfer.mutate(transfer.collection.id)}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorPalette="red"
            onClick={() => setConfirmReject(true)}
          >
            Reject
          </Button>
        </HStack>
      </VStack>
      <ConfirmDialog
        open={confirmReject}
        title="Reject transfer?"
        message={`You'll decline ownership of "${transfer.collection.name}". ${transfer.fromUser.username} will remain the Owner.`}
        confirmLabel="Reject"
        loading={rejectTransfer.isPending}
        onConfirm={handleReject}
        onCancel={() => setConfirmReject(false)}
      />
    </Box>
  );
}

export default function Collections() {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const { data: collections, isLoading } = useCollections();
  const { data: incomingTransfers, isLoading: isLoadingTransfers } = useIncomingTransfers();
  const createCollection = useCreateCollection();
  const { user } = useAuthStore();

  const matchesSearch = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  // Your own recipe book leads the list — it is the one collection you never
  // made and never fill in by hand.
  const owned = collections
    ?.filter((c) => c.members.some((m) => m.userId === user?.id && m.role === 'OWNER') && matchesSearch(c.name))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const shared = collections?.filter((c) => c.members.some((m) => m.userId === user?.id && m.role !== 'OWNER') && matchesSearch(c.name));

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
        <HStack justify="space-between" mb={4} align="center" flexWrap="wrap" gap={3}>
          <Tabs.List w={{ base: 'full', md: 'auto' }}>
            <Tabs.Trigger value="owned" flex={{ base: '1', md: 'unset' }} justifyContent="center">
              My Collections {owned ? `(${owned.length})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="shared" flex={{ base: '1', md: 'unset' }} justifyContent="center">
              Shared with me {shared ? `(${shared.length})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="pending" flex={{ base: '1', md: 'unset' }} justifyContent="center">
              Pending {incomingTransfers ? `(${incomingTransfers.length})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
          <Button colorPalette="green" size="sm" onClick={() => setShowCreate((v) => !v)}>
            + New Collection
          </Button>
        </HStack>

        <Input
          placeholder="Search collections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb={6}
          maxW="400px"
        />

        {showCreate && (
          <Box mb={6} p={4} borderWidth="1px" borderRadius="md" bg="bg.subtle">
            <form onSubmit={handleCreate}>
              <Flex gap={2} direction={{ base: 'column', sm: 'row' }}>
                <Input
                  placeholder="Collection name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
                <HStack gap={2} justify="end">
                  <Button type="submit" colorPalette="green" loading={createCollection.isPending}>Create</Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                </HStack>
              </Flex>
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
                  <Text color="fg.muted">
                    {search ? 'No collections match your search.' : 'No collections yet. Create your first one!'}
                  </Text>
                </Box>
              )}
            </Tabs.Content>

            <Tabs.Content value="shared">
              {shared && shared.length > 0 ? (
                <CollectionGrid collections={shared} userId={user!.id} />
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="fg.muted">
                    {search ? 'No collections match your search.' : 'No collections have been shared with you yet.'}
                  </Text>
                </Box>
              )}
            </Tabs.Content>

            <Tabs.Content value="pending">
              {isLoadingTransfers ? (
                <Box textAlign="center" py={12}><Spinner size="xl" /></Box>
              ) : incomingTransfers && incomingTransfers.length > 0 ? (
                <VStack align="stretch" gap={3} maxW="500px">
                  {incomingTransfers.map((transfer) => (
                    <PendingTransferCard key={transfer.id} transfer={transfer} />
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Text color="fg.muted">No pending ownership transfers.</Text>
                </Box>
              )}
            </Tabs.Content>
          </>
        )}
      </Tabs.Root>
    </Box>
  );
}
