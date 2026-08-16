import { Box, Text, Badge, HStack, Image, VStack, Spinner } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../../types';
import { getSiteDomain } from '../../utils/site';
import { TrashIcon } from '../ui/icons';
import { RecipeCoverPlaceholder } from './RecipeCoverPlaceholder';

interface Props {
  recipe: Recipe;
  addedBy?: string;
  onRemove?: () => void;
  isRemoving?: boolean;
}

export function RecipeCard({ recipe, addedBy, onRemove, isRemoving }: Props) {
  const coverUrl = recipe.coverImage ? `/images/${recipe.coverImage.filePath}` : null;
  const siteDomain = getSiteDomain(recipe.sourceUrl);

  return (
    <Link to={`/recipes/${recipe.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
        transition="all 0.2s"
        bg="bg.panel"
        h="full"
      >
        {coverUrl ? (
          <Image src={coverUrl} alt={recipe.title} h={{ base: '110px', md: '160px' }} w="full" objectFit="cover" />
        ) : (
          <RecipeCoverPlaceholder h={{ base: '110px', md: '160px' }} w="full" />
        )}
        <VStack p={3} align="start" gap={2}>
          <Text
            fontWeight="semibold"
            color="fg"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            w="full"
          >
            {recipe.title}
          </Text>
          <HStack gap={1} flexWrap="wrap">
            {siteDomain && (
              <Badge colorPalette="blue" size="sm">
                {siteDomain}
              </Badge>
            )}
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} colorPalette="green" size="sm">
                {tag.name}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <Badge colorPalette="gray" size="sm">+{recipe.tags.length - 3}</Badge>
            )}
          </HStack>
          <HStack gap={3} rowGap={0} fontSize="sm" color="fg.muted" flexWrap="wrap">
            {recipe.prepTime && <Text>{recipe.prepTime}m prep</Text>}
            {recipe.cookTime && <Text>{recipe.cookTime}m cook</Text>}
            {recipe.servings && <Text>{recipe.servings} servings</Text>}
          </HStack>
          {(addedBy || onRemove) && (
            <HStack w="full" justify="space-between" pt={1} borderTopWidth="1px" borderColor="border.muted">
              {addedBy && (
                <Text fontSize="xs" color="fg.subtle">
                  Added by {addedBy}
                </Text>
              )}
              {onRemove && (
                <Box
                  as="button"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isRemoving) onRemove();
                  }}
                  color="fg.error"
                  _hover={{ color: 'red.solid' }}
                  cursor={isRemoving ? 'default' : 'pointer'}
                  display="flex"
                  alignItems="center"
                  ml="auto"
                  aria-label="Remove recipe"
                >
                  {isRemoving ? <Spinner size="xs" /> : <TrashIcon />}
                </Box>
              )}
            </HStack>
          )}
        </VStack>
      </Box>
    </Link>
  );
}
