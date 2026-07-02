import { useState } from 'react';
import { Box, Button, Flex, Grid, Heading, HStack, Input, Spinner, Text } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { TagInput } from '../components/recipe/TagInput';

export default function MyRecipes() {
  const [search, setSearch] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const { data: recipes, isLoading } = useRecipes({
    search: search || undefined,
    tags: filterTags.length ? filterTags : undefined,
  });

  return (
    <Box py={4}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">My Recipes</Heading>
        <Link to="/recipes/add">
          <Button colorPalette="green">+ Add Recipe</Button>
        </Link>
      </HStack>

      <Flex gap={4} mb={6} direction={{ base: 'column', md: 'row' }}>
        <Input
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w="full"
          maxW={{ md: '400px' }}
        />
        <Box w="full" maxW={{ md: '400px' }}>
          <TagInput value={filterTags} onChange={setFilterTags} placeholder="Filter by tag..." />
        </Box>
      </Flex>

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner size="xl" /></Box>
      ) : recipes && recipes.length > 0 ? (
        <Grid
          templateColumns={{ base: 'repeat(auto-fill, minmax(150px, 1fr))', md: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          gap={{ base: 3, md: 4 }}
        >
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </Grid>
      ) : (
        <Box textAlign="center" py={12}>
          <Text fontSize="2xl" mb={3}>🍴</Text>
          <Text color="gray.500">
            {search || filterTags.length ? 'No recipes match your search.' : 'No recipes yet. Add your first recipe!'}
          </Text>
          {!search && !filterTags.length && (
            <Link to="/recipes/add">
              <Button colorPalette="green" mt={4}>Add Recipe</Button>
            </Link>
          )}
        </Box>
      )}
    </Box>
  );
}
