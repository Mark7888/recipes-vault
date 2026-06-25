import { HStack, Text, Button } from '@chakra-ui/react';
import type { CollectionMember, Role } from '../../types';
import { RoleBadge } from './RoleBadge';

interface Props {
  member: CollectionMember;
  currentUserId: string;
  isOwner: boolean;
  onRoleChange?: (userId: string, role: Role) => void;
  onRemove?: (userId: string) => void;
}

export function MemberRow({ member, currentUserId, isOwner, onRoleChange, onRemove }: Props) {
  return (
    <HStack justify="space-between" py={2} borderBottomWidth="1px" w="full">
      <Text fontWeight="medium">{member.user.username}</Text>
      <HStack gap={2}>
        {isOwner && member.userId !== currentUserId ? (
          <>
            <select
              value={member.role}
              onChange={(e) => onRoleChange?.(member.userId, e.target.value as Role)}
              style={{
                fontSize: '14px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E0',
                cursor: 'pointer',
                background: 'white',
              }}
            >
              <option value="OWNER">OWNER</option>
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={() => onRemove?.(member.userId)}
            >
              Remove
            </Button>
          </>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </HStack>
    </HStack>
  );
}
