import { useState } from 'react';
import {
  Badge, Box, Button, Dialog, HStack, Input, Link as ChakraLink, NativeSelect, Portal, Text, VStack,
} from '@chakra-ui/react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../../hooks/useApiKeys';
import type { ApiKey } from '../../api/api-keys.api';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CopyIcon, PlusIcon, TrashIcon } from '../ui/icons';
import { formatDate, formatDateTime } from '../../utils/date';
import { getErrorMessage } from '../../utils/errors';

/** The presets the dropdown offers. `null` days means the key never expires. */
const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiration', days: null },
];

function expiresAtFrom(days: number | null): string | null {
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="xs"
      colorPalette="green"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <CopyIcon size={13} /> {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

function KeyStatus({ apiKey }: { apiKey: ApiKey }) {
  if (apiKey.revokedAt) return <Badge colorPalette="red">Revoked</Badge>;
  if (apiKey.expired) return <Badge colorPalette="orange">Expired</Badge>;
  return <Badge colorPalette="green">Active</Badge>;
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (key: ApiKey) => void }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={3} opacity={apiKey.active ? 1 : 0.65}>
      <HStack justify="space-between" align="start" gap={2}>
        <VStack align="start" gap={1} flex="1" minW={0}>
          <HStack gap={2} wrap="wrap">
            <Text fontWeight="medium" wordBreak="break-word">{apiKey.name}</Text>
            <KeyStatus apiKey={apiKey} />
          </HStack>
          <Text fontSize="xs" fontFamily="mono" color="fg.muted">{apiKey.prefix}…</Text>
          <Text fontSize="xs" color="fg.muted">
            Created {formatDate(apiKey.createdAt)}
            {' · '}
            {apiKey.expiresAt ? `Expires ${formatDate(apiKey.expiresAt)}` : 'Never expires'}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {apiKey.lastUsedAt ? `Last used ${formatDateTime(apiKey.lastUsedAt)}` : 'Never used'}
          </Text>
        </VStack>
        {!apiKey.revokedAt && (
          <Button
            size="xs"
            variant="outline"
            colorPalette="red"
            onClick={() => onRevoke(apiKey)}
            aria-label={`Revoke ${apiKey.name}`}
          >
            <TrashIcon size={13} /> Revoke
          </Button>
        )}
      </HStack>
    </Box>
  );
}

/**
 * Create a key, see the token once, revoke it later.
 *
 * The token is deliberately shown in a dialog the user has to dismiss: the
 * server keeps only a hash of it, so once this closes there is no way back to
 * it — the honest thing is to make that a moment rather than a line in a list.
 */
export function ApiKeysPanel() {
  const keys = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState<string>('90');
  const [error, setError] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the key a name so you can tell it apart later.'); return; }
    setError('');
    try {
      const created = await createKey.mutateAsync({
        name: name.trim(),
        expiresAt: expiresAtFrom(expiryDays === 'never' ? null : Number(expiryDays)),
      });
      setNewToken(created.token);
      setName('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the key. Please try again.'));
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      await revokeKey.mutateAsync(pendingRevoke.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not revoke the key. Please try again.'));
    } finally {
      setPendingRevoke(null);
    }
  };

  return (
    <VStack align="stretch" gap={5} w="full">
      <Text color="fg.muted" fontSize="sm">
        API keys let scripts and other apps use your account through the REST API. A key can do exactly what you
        can — the same recipes, the same collections, the same access to the AI assistant — but it cannot change
        your password or manage keys. See the{' '}
        <ChakraLink href="/api-docs" colorPalette="green">API documentation</ChakraLink>.
      </Text>

      <form onSubmit={handleCreate}>
        <VStack align="stretch" gap={3}>
          <Box>
            <Text mb={1} fontWeight="medium" fontSize="sm">Name</Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Assistant"
              maxLength={60}
            />
          </Box>
          <Box>
            <Text mb={1} fontWeight="medium" fontSize="sm">Expiration</Text>
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Expiration"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.days === null ? 'never' : String(option.days)}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
          <Button type="submit" colorPalette="green" loading={createKey.isPending}>
            <PlusIcon size={15} /> Create API key
          </Button>
        </VStack>
      </form>

      {error && (
        <Box p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
          <Text color="fg.error" fontSize="sm">{error}</Text>
        </Box>
      )}

      <Box borderTopWidth="1px" pt={4}>
        <Text fontWeight="medium" fontSize="sm" mb={3}>Your keys</Text>
        {keys.isLoading ? (
          <Text fontSize="sm" color="fg.muted">Loading…</Text>
        ) : keys.data && keys.data.length > 0 ? (
          <VStack align="stretch" gap={2}>
            {keys.data.map((apiKey) => (
              <KeyRow key={apiKey.id} apiKey={apiKey} onRevoke={setPendingRevoke} />
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color="fg.muted">No API keys yet.</Text>
        )}
      </Box>

      <Dialog.Root
        open={!!newToken}
        onOpenChange={(e) => { if (!e.open) setNewToken(null); }}
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content mx={4} maxW="480px">
              <Dialog.Header>
                <Dialog.Title>Your new API key</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack align="stretch" gap={3}>
                  <Text color="fg.muted" fontSize="sm">
                    Copy it now — this is the only time it is shown. The server keeps only a hash of it, so it
                    cannot be looked up again. If you lose it, revoke the key and create another.
                  </Text>
                  <Box p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px">
                    <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">{newToken}</Text>
                  </Box>
                  <HStack>{newToken && <CopyButton value={newToken} />}</HStack>
                  <Text color="fg.muted" fontSize="xs">
                    Send it as <Text as="span" fontFamily="mono">Authorization: Bearer &lt;token&gt;</Text> or{' '}
                    <Text as="span" fontFamily="mono">X-API-Key: &lt;token&gt;</Text>.
                  </Text>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setNewToken(null)}>Done</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={!!pendingRevoke}
        title="Revoke this API key?"
        message={
          pendingRevoke
            ? `"${pendingRevoke.name}" stops working immediately, and anything using it will start getting 401s.`
            : ''
        }
        confirmLabel="Revoke"
        loading={revokeKey.isPending}
        onConfirm={handleRevoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </VStack>
  );
}
