import { useState } from 'react';
import { Box, Button, Collapsible, HStack, Input, Text, VStack, Badge } from '@chakra-ui/react';
import { useSearchUsers, useToggleCollectionMember } from '../../hooks/useCollections';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ChevronDownIcon, ShareIcon } from '../ui/icons';
import type { CollectionMember, Role } from '../../types';

interface Props {
  collectionId: string;
  members: CollectionMember[];
  currentUserId: string;
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

export function ShareCollectionPanel({ collectionId, members, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; username: string } | null>(null);

  const { data: results = [] } = useSearchUsers(query);
  const toggle = useToggleCollectionMember();

  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const nonOwnerMembers = members.filter((m) => m.role !== 'OWNER' && m.userId !== currentUserId);

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await toggle.mutateAsync({ collectionId, userId: memberToRemove.userId, isMember: true, role: 'VIEWER' });
    setMemberToRemove(null);
  };

  return (
    <Box position="relative">
      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <Button size="sm" variant="outline" colorPalette="blue">
            <ShareIcon size={14} /> Share
            <ChevronDownIcon size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
          </Button>
        </Collapsible.Trigger>

        <Collapsible.Content position="absolute" top="calc(100% + 8px)" right={0} zIndex={10}>
          <Box bg="bg.panel" shadow="lg" borderWidth="1px" borderRadius="lg" overflow="hidden" minW={{ base: '270px', sm: '360px' }} maxW="88vw">
            {/* Current members (non-owner) */}
            {nonOwnerMembers.length > 0 && (
              <Box borderBottomWidth="1px">
                <Box px={4} py={2} bg="bg.subtle">
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
                    Shared with
                  </Text>
                </Box>
                <VStack gap={0} align="stretch">
                  {nonOwnerMembers.map((m, i) => (
                    <HStack
                      key={m.userId}
                      px={4}
                      py={3}
                      justify="space-between"
                      borderTopWidth={i > 0 ? '1px' : 0}
                    >
                      <HStack gap={2}>
                        <Text fontSize="sm" fontWeight="medium">{m.user.username}</Text>
                        <Badge size="sm" colorPalette={m.role === 'EDITOR' ? 'orange' : 'gray'}>
                          {ROLE_LABELS[m.role]}
                        </Badge>
                      </HStack>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setMemberToRemove({ userId: m.userId, username: m.user.username })}
                      >
                        Remove
                      </Button>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

            {/* User search */}
            <Box px={3} py={2} borderBottomWidth="1px" bg="bg.subtle">
              <Input
                size="sm"
                placeholder="Search users by username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus={nonOwnerMembers.length === 0}
              />
            </Box>

            {query.trim().length >= 2 && (
              results.length === 0 ? (
                <Box px={4} py={3}>
                  <Text fontSize="sm" color="fg.muted">No users found.</Text>
                </Box>
              ) : (
                <VStack gap={0} align="stretch">
                  {results.map((u, i) => {
                    const existing = memberMap.get(u.id);
                    const loading = toggle.isPending && (toggle.variables as { userId: string })?.userId === u.id;
                    return (
                      <HStack
                        key={u.id}
                        px={4}
                        py={3}
                        justify="space-between"
                        borderTopWidth={i > 0 ? '1px' : 0}
                        bg={existing ? 'blue.subtle' : 'bg.panel'}
                      >
                        <HStack gap={2}>
                          <Text fontSize="sm" fontWeight="medium">{u.username}</Text>
                          {existing && (
                            <Badge size="sm" colorPalette={existing.role === 'EDITOR' ? 'orange' : 'gray'}>
                              {ROLE_LABELS[existing.role]}
                            </Badge>
                          )}
                        </HStack>
                        {existing ? (
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            onClick={() => setMemberToRemove({ userId: u.id, username: u.username })}
                          >
                            Remove
                          </Button>
                        ) : (
                          <HStack gap={1}>
                            <Button
                              size="xs"
                              variant="outline"
                              colorPalette="blue"
                              loading={loading}
                              onClick={() => toggle.mutate({ collectionId, userId: u.id, isMember: false, role: 'VIEWER' })}
                            >
                              + Viewer
                            </Button>
                            <Button
                              size="xs"
                              colorPalette="blue"
                              loading={loading}
                              onClick={() => toggle.mutate({ collectionId, userId: u.id, isMember: false, role: 'EDITOR' })}
                            >
                              + Editor
                            </Button>
                          </HStack>
                        )}
                      </HStack>
                    );
                  })}
                </VStack>
              )
            )}

            {query.trim().length < 2 && query.length > 0 && (
              <Box px={4} py={3}>
                <Text fontSize="sm" color="fg.subtle">Type at least 2 characters to search.</Text>
              </Box>
            )}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>

      <ConfirmDialog
        open={memberToRemove !== null}
        title="Remove member?"
        message={`${memberToRemove?.username ?? 'This member'} will lose access to this collection.`}
        confirmLabel="Remove"
        loading={toggle.isPending}
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </Box>
  );
}
