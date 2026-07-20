import { useState } from 'react';
import {
  Box, Button, Heading, HStack, Input, VStack, Text, Spinner, NativeSelect, Badge,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAllTags, useRenameTag, useMergeTag, useDeleteTag } from '../hooks/useTags';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getErrorMessage } from '../utils/errors';
import type { TagWithCount } from '../api/tags.api';

function TagRow({ tag, allTags }: { tag: TagWithCount; allTags: TagWithCount[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const renameTag = useRenameTag();
  const mergeTag = useMergeTag();
  const deleteTag = useDeleteTag();

  const otherTags = allTags.filter((t) => t.id !== tag.id);
  const mergeTarget = otherTags.find((t) => t.id === mergeTargetId);

  const handleRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) { setEditing(false); setName(tag.name); return; }
    setError('');
    try {
      await renameTag.mutateAsync({ id: tag.id, name: trimmed });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to rename tag'));
    }
  };

  const handleMerge = async () => {
    if (!mergeTargetId) return;
    setError('');
    try {
      await mergeTag.mutateAsync({ id: tag.id, targetId: mergeTargetId });
      setConfirmMerge(false);
      setMergeTargetId('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to merge tag'));
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await deleteTag.mutateAsync(tag.id);
      setConfirmDelete(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete tag'));
    }
  };

  return (
    <Box w="full" py={2} borderBottomWidth="1px">
      <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
        <HStack gap={2} flex="1" minW="180px">
          {editing ? (
            <Input
              size="sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setName(tag.name); } }}
              autoFocus
              maxW="220px"
            />
          ) : (
            <Text fontWeight="medium">{tag.name}</Text>
          )}
          <Badge colorPalette="gray" size="sm">{tag.recipeCount} recipe{tag.recipeCount === 1 ? '' : 's'}</Badge>
        </HStack>
        <HStack gap={2} flexWrap="wrap">
          {editing ? (
            <>
              <Button size="xs" colorPalette="green" onClick={handleRename} loading={renameTag.isPending}>Save</Button>
              <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setName(tag.name); }}>Cancel</Button>
            </>
          ) : (
            <Button size="xs" variant="outline" onClick={() => setEditing(true)}>Rename</Button>
          )}
          <NativeSelect.Root size="xs" w="160px">
            <NativeSelect.Field
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
            >
              <option value="">Merge into...</option>
              {otherTags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            size="xs"
            variant="outline"
            colorPalette="orange"
            disabled={!mergeTargetId}
            onClick={() => setConfirmMerge(true)}
          >
            Merge
          </Button>
          <Button size="xs" variant="ghost" colorPalette="red" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </HStack>
      </HStack>
      {error && <Text color="fg.error" fontSize="xs" mt={1}>{error}</Text>}

      <ConfirmDialog
        open={confirmMerge}
        title="Merge tag?"
        message={`All recipes tagged "${tag.name}" will be retagged "${mergeTarget?.name ?? ''}", and "${tag.name}" will be deleted. This cannot be undone.`}
        confirmLabel="Merge"
        loading={mergeTag.isPending}
        onConfirm={handleMerge}
        onCancel={() => setConfirmMerge(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete tag?"
        message={`"${tag.name}" will be removed from ${tag.recipeCount} recipe${tag.recipeCount === 1 ? '' : 's'}. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteTag.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Box>
  );
}

export default function TagManagement() {
  const { data: tags, isLoading } = useAllTags();
  const [search, setSearch] = useState('');

  const filtered = tags?.filter((t) => t.name.includes(search.toLowerCase().trim())) ?? [];

  return (
    <Box maxW="700px" mx="auto" py={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Manage Tags</Heading>
        <Link to="/settings/preferences">
          <Button variant="ghost">Back</Button>
        </Link>
      </HStack>

      <Input
        placeholder="Search tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb={4}
      />

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner size="xl" /></Box>
      ) : filtered.length > 0 ? (
        <VStack align="start" gap={0} w="full">
          {filtered.map((tag) => (
            <TagRow key={tag.id} tag={tag} allTags={tags ?? []} />
          ))}
        </VStack>
      ) : (
        <Text color="fg.muted" textAlign="center" py={8}>
          {tags && tags.length > 0 ? 'No tags match your search.' : 'No tags yet.'}
        </Text>
      )}
    </Box>
  );
}
