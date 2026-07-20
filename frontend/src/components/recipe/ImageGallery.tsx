import { useState } from 'react';
import { Box, HStack, Image } from '@chakra-ui/react';
import type { Image as RecipeImage } from '../../types';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  images: RecipeImage[];
  coverImageId?: string;
  title: string;
}

export function ImageGallery({ images, coverImageId, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const heroIndex = Math.max(0, images.findIndex((img) => img.id === coverImageId));
  const hero = images[heroIndex];

  return (
    <Box w="full">
      <Image
        src={`/images/${hero.filePath}`}
        alt={title}
        w="full"
        maxH={{ base: '240px', md: '400px' }}
        objectFit="cover"
        borderRadius="xl"
        cursor="pointer"
        onClick={() => setLightboxIndex(heroIndex)}
      />
      {images.length > 1 && (
        <HStack gap={2} mt={2} overflowX="auto" pb={1}>
          {images.map((img, i) => (
            <Image
              key={img.id}
              src={`/images/${img.filePath}`}
              alt=""
              boxSize="64px"
              objectFit="cover"
              borderRadius="md"
              cursor="pointer"
              flexShrink={0}
              borderWidth={i === heroIndex ? '2px' : '1px'}
              borderColor={i === heroIndex ? 'green.500' : 'border'}
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </HStack>
      )}
      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </Box>
  );
}
