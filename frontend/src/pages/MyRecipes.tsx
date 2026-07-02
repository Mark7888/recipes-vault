import { useState } from 'react';
import { Box, Button, Field, Flex, Grid, Heading, HStack, Input, NativeSelect, Spinner, Text } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useRecipes, useRecipeSites } from '../hooks/useRecipes';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { TagInput } from '../components/recipe/TagInput';

export default function MyRecipes() {
  const [search, setSearch] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterSite, setFilterSite] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { data: recipes, isLoading } = useRecipes({
    search: search || undefined,
    tags: filterTags.length ? filterTags : undefined,
    site: filterSite || undefined,
  });
  const { data: sites } = useRecipeSites();

  const extraFilterCount = filterSite ? 1 : 0;
  const hasAnyFilter = Boolean(search) || filterTags.length > 0 || Boolean(filterSite);

  return (
    <Box py={4}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">My Recipes</Heading>
        <Link to="/recipes/add">
          <Button colorPalette="green">+ Add Recipe</Button>
        </Link>
      </HStack>

      <Flex gap={4} mb={showMoreFilters ? 3 : 6} direction={{ base: 'column', md: 'row' }} align={{ md: 'flex-start' }}>
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
        <Button variant="outline" onClick={() => setShowMoreFilters((v) => !v)} flexShrink={0}>
          More filters{extraFilterCount > 0 ? ` (${extraFilterCount})` : ''} {showMoreFilters ? '▴' : '▾'}
        </Button>
      </Flex>

      {showMoreFilters && (
        <Box borderWidth="1px" borderRadius="md" p={4} mb={6} bg="gray.50">
          <Flex gap={4} direction={{ base: 'column', md: 'row' }} align={{ md: 'flex-end' }}>
            <Field.Root w="full" maxW={{ md: '300px' }}>
              <Field.Label fontSize="sm">Site</Field.Label>
              <NativeSelect.Root size="sm" bg="white">
                <NativeSelect.Field
                  value={filterSite}
                  onChange={(e) => setFilterSite(e.target.value)}
                >
                  <option value="">All sites</option>
                  {sites?.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            {filterSite && (
              <Button size="sm" variant="ghost" onClick={() => setFilterSite('')}>
                Clear
              </Button>
            )}
          </Flex>
        </Box>
      )}

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
            {hasAnyFilter ? 'No recipes match your search.' : 'No recipes yet. Add your first recipe!'}
          </Text>
          {!hasAnyFilter && (
            <Link to="/recipes/add">
              <Button colorPalette="green" mt={4}>Add Recipe</Button>
            </Link>
          )}
        </Box>
      )}
    </Box>
  );
}
