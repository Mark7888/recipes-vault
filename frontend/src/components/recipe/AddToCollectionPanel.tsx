import { useState } from 'react';
import { Box, Button, Collapsible, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { useCollections } from '../../hooks/useCollections';
import { useRecipeCollections, useToggleRecipeInCollection } from '../../hooks/useRecipes';
import { useAuthStore } from '../../store/authStore';
import { ChevronDownIcon, PlusIcon } from '../ui/icons';

interface Props {
  recipeId: string;
}

export function AddToCollectionPanel({ recipeId }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { user } = useAuthStore();
  const { data: collections = [] } = useCollections();
  const { data: memberOf = [] } = useRecipeCollections(recipeId);
  const toggle = useToggleRecipeInCollection();

  const filtered = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box w="full" position="relative">
      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <Button size="sm" variant="outline" colorPalette="green">
            <PlusIcon size={14} /> Add to collection
            <ChevronDownIcon size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
          </Button>
        </Collapsible.Trigger>

        <Collapsible.Content position="absolute" top="calc(100% + 8px)" left={0} zIndex={10} w="full" maxW="480px">
          <Box bg="white" shadow="lg" borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Box px={3} py={2} borderBottomWidth="1px" bg="gray.50">
              <Input
                size="sm"
                placeholder="Search collections…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </Box>

            {filtered.length === 0 ? (
              <Box px={4} py={3}>
                <Text fontSize="sm" color="gray.500">No collections found.</Text>
              </Box>
            ) : (
              <VStack gap={0} align="stretch">
                {filtered.map((col, i) => {
                  const entry = memberOf.find((m) => m.collectionId === col.id);
                  const inCollection = !!entry;
                  const myRole = col.members.find((m) => m.userId === user?.id)?.role;
                  const canRemove = inCollection && (entry.addedById === user?.id || myRole === 'OWNER');
                  const loading = toggle.isPending && (toggle.variables as { collectionId: string })?.collectionId === col.id;
                  return (
                    <HStack
                      key={col.id}
                      px={4}
                      py={3}
                      justify="space-between"
                      borderTopWidth={i > 0 ? '1px' : 0}
                      bg={inCollection ? 'green.50' : 'white'}
                    >
                      <VStack align="start" gap={0}>
                        <Text fontSize="sm" fontWeight="medium">{col.name}</Text>
                        <Text fontSize="xs" color="gray.400">
                          {col._count?.recipes ?? 0} recipes · {col.members.length} members
                        </Text>
                      </VStack>
                      {inCollection && !canRemove ? (
                        <Text fontSize="xs" color="gray.400">Added by others</Text>
                      ) : (
                        <Button
                          size="xs"
                          colorPalette={inCollection ? 'red' : 'green'}
                          variant={inCollection ? 'outline' : 'solid'}
                          loading={loading}
                          onClick={() => toggle.mutate({ collectionId: col.id, recipeId, inCollection })}
                        >
                          {inCollection ? 'Remove' : 'Add'}
                        </Button>
                      )}
                    </HStack>
                  );
                })}
              </VStack>
            )}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
}
