import { useState } from 'react';
import { Box, Button, Heading, Input, SimpleGrid, VStack, HStack, Text, Badge, Spinner } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCaptureRecipe, useCreateRecipe } from '../hooks/useRecipes';
import { useAiStatus } from '../hooks/useAi';
import { AiRecipeChat, type ChatEntry } from '../components/recipe/AiRecipeChat';
import { LinkIcon, SparkleIcon, EditIcon } from '../components/ui/icons';
import { getErrorMessage } from '../utils/errors';

type Mode = 'link' | 'ai' | 'manual';

interface ModeCardProps {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

function ModeCard({ active, disabled, icon, title, description, badge, onClick }: ModeCardProps) {
  return (
    <Box
      as="button"
      onClick={onClick}
      textAlign="left"
      w="full"
      h="full"
      p={{ base: 3, sm: 4 }}
      borderWidth="2px"
      borderRadius="lg"
      borderColor={active ? 'green.500' : 'border'}
      bg={active ? 'bg.subtle' : 'bg.panel'}
      opacity={disabled && !active ? 0.7 : 1}
      cursor="pointer"
      transition="border-color 0.15s, background 0.15s"
      _hover={{ borderColor: active ? 'green.500' : 'border.emphasized' }}
    >
      <VStack align="start" gap={1}>
        <HStack gap={2} w="full">
          <Box color={active ? 'green.fg' : 'fg.muted'} flexShrink={0}>{icon}</Box>
          <Text fontWeight="semibold" fontSize={{ base: 'xs', sm: 'sm' }}>{title}</Text>
          {badge && <Badge size="sm" colorPalette="gray" ms="auto">{badge}</Badge>}
        </HStack>
        {/* Descriptions are dropped on phones so the chat panel below keeps
            its composer above the fold. */}
        <Text fontSize="xs" color="fg.muted" hideBelow="sm">{description}</Text>
      </VStack>
    </Box>
  );
}

export default function AddRecipe() {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(searchParams.get('url') ?? '');
  const [mode, setMode] = useState<Mode>('link');
  // Held here rather than inside the chat so switching tabs never drops a
  // conversation that is already under way.
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);

  const navigate = useNavigate();
  const capture = useCaptureRecipe();
  const createRecipe = useCreateRecipe();
  const aiStatus = useAiStatus();

  // No API key on the server means the assistant does not exist for anyone —
  // don't advertise it at all.
  const showAiOption = aiStatus.isLoading || !!aiStatus.data?.configured;
  const aiEnabled = !!aiStatus.data?.enabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await capture.mutateAsync(url);
      navigate(`/recipes/${result.recipeId}/edit`);
    } catch {
      // error shown below
    }
  };

  const handleCreateEmpty = async () => {
    try {
      const recipe = await createRecipe.mutateAsync(undefined);
      navigate(`/recipes/${recipe.id}/edit`);
    } catch {
      // error shown below
    }
  };

  return (
    <Box maxW={mode === 'ai' ? '820px' : '600px'} mx="auto" py={8}>
      <VStack align="stretch" gap={6}>
        <Heading size="lg">Add New Recipe</Heading>

        <SimpleGrid columns={showAiOption ? 3 : 2} gap={{ base: 2, sm: 3 }}>
          <ModeCard
            active={mode === 'link'}
            icon={<LinkIcon size={18} />}
            title="From a link"
            description="Paste a recipe URL and we'll extract everything."
            onClick={() => setMode('link')}
          />
          {showAiOption && (
            <ModeCard
              active={mode === 'ai'}
              disabled={!aiEnabled}
              icon={<SparkleIcon size={18} />}
              title="Chat with AI"
              description="Get suggestions, or talk about a screenshot."
              badge={aiStatus.isLoading ? undefined : aiEnabled ? undefined : 'Off'}
              onClick={() => setMode('ai')}
            />
          )}
          <ModeCard
            active={mode === 'manual'}
            icon={<EditIcon size={18} />}
            title="Manually"
            description="Start from a blank recipe and type it in."
            onClick={() => setMode('manual')}
          />
        </SimpleGrid>

        {mode === 'link' && (
          <VStack align="stretch" gap={4}>
            <Text color="fg.muted" fontSize="sm">
              Paste a recipe URL below to automatically extract the recipe details.
            </Text>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack gap={4}>
                <Box w="full">
                  <Text mb={1} fontWeight="medium" fontSize="sm">Recipe URL</Text>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/recipe/..."
                    type="url"
                    required
                  />
                </Box>
                {capture.isError && (
                  <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
                    <Text color="fg.error" fontSize="sm">
                      {getErrorMessage(capture.error, 'Failed to capture recipe. Please try again.')}
                    </Text>
                  </Box>
                )}
                <Button type="submit" colorPalette="green" w="full" loading={capture.isPending}>
                  {capture.isPending ? 'Fetching recipe...' : 'Capture Recipe'}
                </Button>
              </VStack>
            </form>
          </VStack>
        )}

        {mode === 'ai' && (
          aiStatus.isLoading ? (
            <HStack justify="center" py={10} gap={3}>
              <Spinner size="sm" />
              <Text color="fg.muted" fontSize="sm">Checking assistant availability…</Text>
            </HStack>
          ) : aiEnabled ? (
            <AiRecipeChat
              messages={chatMessages}
              onMessagesChange={setChatMessages}
              model={aiStatus.data?.model}
            />
          ) : (
            <Box p={5} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
              <VStack align="start" gap={2}>
                <HStack gap={2}>
                  <Box color="fg.muted"><SparkleIcon size={18} /></Box>
                  <Text fontWeight="semibold">The AI assistant is off for your account</Text>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Chatting your way to a recipe has to be switched on per account. Ask the
                  administrator of this RecipeVault to enable it for you, then reload this page.
                </Text>
              </VStack>
            </Box>
          )
        )}

        {mode === 'manual' && (
          <VStack align="stretch" gap={4}>
            <Text color="fg.muted" fontSize="sm">
              Start with a blank recipe and fill in the title, ingredients and steps yourself.
            </Text>
            {createRecipe.isError && (
              <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
                <Text color="fg.error" fontSize="sm">
                  {getErrorMessage(createRecipe.error, 'Failed to create recipe. Please try again.')}
                </Text>
              </Box>
            )}
            <Button
              variant="outline"
              colorPalette="green"
              w="full"
              onClick={handleCreateEmpty}
              loading={createRecipe.isPending}
            >
              Start with an empty recipe
            </Button>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
