import { useState } from 'react';
import { Box, Button, Grid, Heading, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react';
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

      <VStack align="start" gap={4} mb={6}>
        <Input
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="400px"
        />
        <Box w="full" maxW="400px">
          <TagInput value={filterTags} onChange={setFilterTags} />
        </Box>
      </VStack>

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner size="xl" /></Box>
      ) : recipes && recipes.length > 0 ? (
        <Grid templateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={4}>
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
