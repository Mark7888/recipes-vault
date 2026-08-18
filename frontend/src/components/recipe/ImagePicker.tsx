import { useRef, useState } from 'react';
import {
  Button, Grid, Text, VStack, HStack
} from '@chakra-ui/react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import type { Image as RecipeImage } from '../../types';
import { useUploadRecipeImage, useDeleteRecipeImage, useSetCoverImage, useReorderImages } from '../../hooks/useRecipes';
import { useClipboardImage } from '../../hooks/useClipboardImage';
import { readClipboardImage } from '../../utils/clipboard';
import { ClipboardIcon } from '../ui/icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SortableImageItem } from './SortableImageItem';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  recipeId: string;
  images: RecipeImage[];
  coverImageId?: string;
}

export function ImagePicker({ recipeId, images, coverImageId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadRecipeImage();
  const deleteMutation = useDeleteRecipeImage();
  const setCoverMutation = useSetCoverImage();
  const reorderMutation = useReorderImages();
  const [imageToDelete, setImageToDelete] = useState<RecipeImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [clipboardError, setClipboardError] = useState('');
  const [pastingFromClipboard, setPastingFromClipboard] = useState(false);
  const clipboardOffered = useClipboardImage();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDelete = async () => {
    if (!imageToDelete) return;
    await deleteMutation.mutateAsync({ id: recipeId, imageId: imageToDelete.id });
    setImageToDelete(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClipboardError('');
    await uploadMutation.mutateAsync({ id: recipeId, file });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePasteFromClipboard = async () => {
    setClipboardError('');
    setPastingFromClipboard(true);
    try {
      const file = await readClipboardImage();
      if (!file) { setClipboardError('There is no image on the clipboard.'); return; }
      await uploadMutation.mutateAsync({ id: recipeId, file });
    } catch {
      // Denied permission, or a browser that will not hand the clipboard over.
      setClipboardError('Could not read the clipboard. Allow clipboard access, or use Upload Image.');
    } finally {
      setPastingFromClipboard(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(images, oldIndex, newIndex);
    reorderMutation.mutate({ id: recipeId, imageIds: reordered.map((img) => img.id) });
  };

  return (
    <VStack align="start" gap={4}>
      <VStack align="start" gap={2}>
        <HStack flexWrap="wrap" gap={2}>
          <Button
            size="sm"
            colorPalette="green"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            loading={uploadMutation.isPending && !pastingFromClipboard}
          >
            Upload Image
          </Button>
          {clipboardOffered && (
            <Button
              size="sm"
              colorPalette="green"
              variant="outline"
              onClick={handlePasteFromClipboard}
              loading={pastingFromClipboard}
            >
              <ClipboardIcon size={14} /> From Clipboard
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        </HStack>
        {clipboardError && <Text color="fg.error" fontSize="sm">{clipboardError}</Text>}
      </VStack>
      {images.length > 0 ? (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3} w="full">
              {images.map((img, index) => (
                <SortableImageItem
                  key={img.id}
                  image={img}
                  isCover={img.id === coverImageId}
                  onOpen={() => setLightboxIndex(index)}
                  onSetCover={() => setCoverMutation.mutate({ id: recipeId, imageId: img.id })}
                  onRemove={() => setImageToDelete(img)}
                />
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      ) : (
        <Text color="fg.muted" fontSize="sm">No images yet. Upload one above.</Text>
      )}

      <ConfirmDialog
        open={imageToDelete !== null}
        title="Remove image?"
        message="This image will be permanently removed from the recipe."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setImageToDelete(null)}
      />

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </VStack>
  );
}
