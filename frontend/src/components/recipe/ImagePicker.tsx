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
    await uploadMutation.mutateAsync({ id: recipeId, file });
    if (fileRef.current) fileRef.current.value = '';
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
      <HStack>
        <Button
          size="sm"
          colorPalette="green"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          loading={uploadMutation.isPending}
        >
          Upload Image
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </HStack>
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
