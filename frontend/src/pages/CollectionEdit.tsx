import { useState } from 'react';
import {
  Box, Button, Heading, HStack, Input, VStack, Text, Spinner
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCollection,
  useRenameCollection,
  useDeleteCollection,
  useUpdateMemberRole,
  useRemoveCollectionMember,
} from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { MemberRow } from '../components/collection/MemberRow';
import type { Role } from '../types';

export default function CollectionEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: collection, isLoading } = useCollection(id!);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const renameCollection = useRenameCollection();
  const deleteCollection = useDeleteCollection();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveCollectionMember();

  const [name, setName] = useState('');

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (!collection) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">Collection not found.</Text>
      </Box>
    );
  }

  const myRole = collection.members.find((m) => m.userId === user?.id)?.role;
  if (myRole !== 'OWNER') {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">Only the Owner can edit this collection.</Text>
      </Box>
    );
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await renameCollection.mutateAsync({ id: id!, name: name.trim() });
    setName('');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this collection? Recipes will NOT be deleted.')) return;
    await deleteCollection.mutateAsync(id!);
    navigate('/collections');
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    await updateRole.mutateAsync({ id: id!, userId, role });
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this member?')) return;
    await removeMember.mutateAsync({ id: id!, userId });
  };

  return (
    <Box maxW="600px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        <HStack justify="space-between" w="full">
          <Heading size="lg">Edit Collection</Heading>
          <Button variant="ghost" onClick={() => navigate(`/collections/${id}`)}>Back</Button>
        </HStack>

        <Box w="full">
          <Heading size="sm" mb={3}>Rename Collection</Heading>
          <form onSubmit={handleRename}>
            <HStack gap={2}>
              <Input
                placeholder={collection.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Button type="submit" colorPalette="green" loading={renameCollection.isPending}>Rename</Button>
            </HStack>
          </form>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={3}>Members</Heading>
          <VStack align="start" gap={0} w="full">
            {collection.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={user!.id}
                isOwner={myRole === 'OWNER'}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
              />
            ))}
          </VStack>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={3} color="red.500">Danger Zone</Heading>
          <Button colorPalette="red" variant="outline" onClick={handleDelete} loading={deleteCollection.isPending}>
            Delete Collection
          </Button>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Recipes will NOT be deleted — they will remain in their owners' libraries.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
