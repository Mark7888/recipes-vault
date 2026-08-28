import { useState } from 'react';
import { HStack, NativeSelect, Text, Button } from '@chakra-ui/react';
import type { CollectionMember, Role } from '../../types';
import { RoleBadge } from './RoleBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Props {
  member: CollectionMember;
  currentUserId: string;
  isOwner: boolean;
  /** False on a recipe book: everyone on it is a Viewer and it never changes hands. */
  canChangeRole?: boolean;
  onRoleChange?: (userId: string, role: Role) => void;
  onRemove?: (userId: string) => void;
  onTransfer?: (userId: string) => void;
  transferPending?: boolean;
}

export function MemberRow({ member, currentUserId, isOwner, canChangeRole = true, onRoleChange, onRemove, onTransfer, transferPending }: Props) {
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const canManage = isOwner && member.userId !== currentUserId;

  const handleConfirmTransfer = () => {
    onTransfer?.(member.userId);
    setConfirmTransfer(false);
  };

  return (
    <HStack justify="space-between" py={2} borderBottomWidth="1px" w="full" flexWrap="wrap" gap={2}>
      <Text fontWeight="medium">{member.user.username}</Text>
      <HStack gap={2}>
        {canManage ? (
          <>
            {canChangeRole ? (
              <NativeSelect.Root size="sm" w="auto">
                <NativeSelect.Field
                  value={member.role}
                  onChange={(e) => onRoleChange?.(member.userId, e.target.value as Role)}
                >
                  <option value="EDITOR">EDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            ) : (
              <RoleBadge role={member.role} />
            )}
            {canChangeRole && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="orange"
                onClick={() => setConfirmTransfer(true)}
              >
                Transfer ownership
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => onRemove?.(member.userId)}
            >
              Remove
            </Button>
            <ConfirmDialog
              open={confirmTransfer}
              title="Transfer ownership?"
              message={`${member.user.username} will be asked to accept ownership of this collection. While the transfer is pending, you won't be able to manage it.`}
              confirmLabel="Send request"
              loading={transferPending}
              onConfirm={handleConfirmTransfer}
              onCancel={() => setConfirmTransfer(false)}
            />
          </>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </HStack>
    </HStack>
  );
}
