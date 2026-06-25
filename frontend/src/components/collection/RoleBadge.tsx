import { Badge } from '@chakra-ui/react';
import type { Role } from '../../types';

interface Props {
  role: Role;
}

const colorMap: Record<Role, string> = {
  OWNER: 'purple',
  EDITOR: 'blue',
  VIEWER: 'gray',
};

export function RoleBadge({ role }: Props) {
  return (
    <Badge colorPalette={colorMap[role]} size="sm">
      {role}
    </Badge>
  );
}
