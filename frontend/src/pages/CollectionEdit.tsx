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
  useTransferOwnership,
  useCancelTransfer,
} from '../hooks/useCollections';
import { useAuthStore } from '../store/authStore';
import { MemberRow } from '../components/collection/MemberRow';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
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
  const transferOwnership = useTransferOwnership();
  const cancelTransfer = useCancelTransfer();

  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [confirmCancelTransfer, setConfirmCancelTransfer] = useState(false);

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (!collection) {
    return (
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">Collection not found.</Text>
      </Box>
    );
  }

  const myRole = collection.members.find((m) => m.userId === user?.id)?.role;
  if (myRole !== 'OWNER') {
    return (
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">Only the Owner can edit this collection.</Text>
      </Box>
    );
  }

  const pendingTransfer = collection.pendingTransfer;

  const handleCancelTransfer = async () => {
    // The other party may have just accepted/rejected this same transfer —
    // the backend treats that as a no-op success, but close the dialog
    // regardless so a race never leaves it stuck open.
    try {
      await cancelTransfer.mutateAsync(id!);
    } finally {
      setConfirmCancelTransfer(false);
    }
  };

  if (pendingTransfer) {
    return (
      <Box maxW="600px" mx="auto" py={6}>
        <VStack align="start" gap={6}>
          <HStack justify="space-between" w="full">
            <Heading size="lg">Edit Collection</Heading>
            <Button variant="ghost" onClick={() => navigate(`/collections/${id}`)}>Back</Button>
          </HStack>
          <Box w="full" p={4} bg="bg.warning" borderRadius="md" borderWidth="1px" borderColor="border.warning">
            <Text color="fg.warning" fontWeight="medium">
              Ownership transfer to {pendingTransfer.toUser.username} is pending.
            </Text>
            <Text color="fg.muted" fontSize="sm" mt={1}>
              You can't manage this collection until {pendingTransfer.toUser.username} accepts or rejects the request, or you cancel it.
            </Text>
          </Box>
          <Button
            colorPalette="red"
            variant="outline"
            onClick={() => setConfirmCancelTransfer(true)}
          >
            Cancel Transfer
          </Button>
        </VStack>
        <ConfirmDialog
          open={confirmCancelTransfer}
          title="Cancel transfer?"
          message={`The pending ownership transfer to ${pendingTransfer.toUser.username} will be cancelled.`}
          confirmLabel="Cancel Transfer"
          loading={cancelTransfer.isPending}
          onConfirm={handleCancelTransfer}
          onCancel={() => setConfirmCancelTransfer(false)}
        />
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
    await deleteCollection.mutateAsync(id!);
    setConfirmDelete(false);
    navigate('/collections');
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    await updateRole.mutateAsync({ id: id!, userId, role });
  };

  const handleTransfer = async (userId: string) => {
    await transferOwnership.mutateAsync({ id: id!, toUserId: userId });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember.mutateAsync({ id: id!, userId: memberToRemove });
    setMemberToRemove(null);
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
                onRemove={(userId) => setMemberToRemove(userId)}
                onTransfer={handleTransfer}
                transferPending={transferOwnership.isPending}
              />
            ))}
          </VStack>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={3} color="fg.error">Danger Zone</Heading>
          <Button colorPalette="red" variant="outline" onClick={() => setConfirmDelete(true)}>
            Delete Collection
          </Button>
          <Text fontSize="sm" color="fg.muted" mt={2}>
            Recipes will NOT be deleted — they will remain in their owners' libraries.
          </Text>
        </Box>
      </VStack>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete collection?"
        message={`"${collection.name}" will be deleted. Recipes will NOT be deleted — they remain in their owners' libraries.`}
        loading={deleteCollection.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove member?"
        message={`${collection.members.find((m) => m.userId === memberToRemove)?.user.username ?? 'This member'} will lose access to this collection.`}
        confirmLabel="Remove"
        loading={removeMember.isPending}
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </Box>
  );
}
