import { Button, Dialog, Portal, Text } from '@chakra-ui/react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', loading, onConfirm, onCancel }: Props) {
  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => { if (!e.open) onCancel(); }}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx={4} maxW="380px">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">{message}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button colorPalette="red" onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
