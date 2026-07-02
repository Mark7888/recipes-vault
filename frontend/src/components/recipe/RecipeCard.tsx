import { Box, Text, Badge, HStack, Image, VStack, Spinner } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../../types';
import { getSiteDomain } from '../../utils/site';

interface Props {
  recipe: Recipe;
  addedBy?: string;
  onRemove?: () => void;
  isRemoving?: boolean;
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
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
        bg="white"
        h="full"
      >
        {coverUrl ? (
          <Image src={coverUrl} alt={recipe.title} h={{ base: '110px', md: '160px' }} w="full" objectFit="cover" />
        ) : (
          <Box h={{ base: '110px', md: '160px' }} bg="gray.100" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="4xl">🍴</Text>
          </Box>
        )}
        <VStack p={3} align="start" gap={2}>
          <Text
            fontWeight="semibold"
            color="gray.800"
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
          <HStack gap={3} rowGap={0} fontSize="sm" color="gray.500" flexWrap="wrap">
            {recipe.prepTime && <Text>{recipe.prepTime}m prep</Text>}
            {recipe.cookTime && <Text>{recipe.cookTime}m cook</Text>}
            {recipe.servings && <Text>{recipe.servings} servings</Text>}
          </HStack>
          {(addedBy || onRemove) && (
            <HStack w="full" justify="space-between" pt={1} borderTopWidth="1px" borderColor="gray.100">
              {addedBy && (
                <Text fontSize="xs" color="gray.400">
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
                  color="red.400"
                  _hover={{ color: 'red.600' }}
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
