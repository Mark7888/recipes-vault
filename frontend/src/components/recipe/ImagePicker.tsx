import { useRef } from 'react';
import {
  Box, Button, Grid, GridItem, Image, Text, VStack, HStack, Badge
} from '@chakra-ui/react';
import type { Image as RecipeImage } from '../../types';
import { useUploadRecipeImage, useDeleteRecipeImage, useSetCoverImage } from '../../hooks/useRecipes';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadMutation.mutateAsync({ id: recipeId, file });
    if (fileRef.current) fileRef.current.value = '';
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
        <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap={3} w="full">
          {images.map((img) => (
            <GridItem key={img.id} position="relative">
              <Box
                borderRadius="md"
                overflow="hidden"
                borderWidth={img.id === coverImageId ? '2px' : '1px'}
                borderColor={img.id === coverImageId ? 'green.500' : 'gray.200'}
              >
                <Image
                  src={`/images/${img.filePath}`}
                  alt="Recipe image"
                  h="100px"
                  w="full"
                  objectFit="cover"
                />
                <VStack gap={1} p={1}>
                  {img.id === coverImageId ? (
                    <Badge colorPalette="green" size="sm">Cover</Badge>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="green"
                      onClick={() => setCoverMutation.mutate({ id: recipeId, imageId: img.id })}
                    >
                      Set cover
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => deleteMutation.mutate({ id: recipeId, imageId: img.id })}
                    loading={deleteMutation.isPending}
                  >
                    Remove
                  </Button>
                </VStack>
              </Box>
            </GridItem>
          ))}
        </Grid>
      ) : (
        <Text color="gray.500" fontSize="sm">No images yet. Upload one above.</Text>
      )}
    </VStack>
  );
}
