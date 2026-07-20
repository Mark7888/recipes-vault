import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Heading, HStack, Input, VStack, Text, Textarea, Spinner
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useRecipe, useUpdateRecipe, useDeleteRecipe, useRecipeImages } from '../hooks/useRecipes';
import { recipesApi } from '../api/recipes.api';
import { useAuthStore } from '../store/authStore';
import { TagInput } from '../components/recipe/TagInput';
import { ImagePicker } from '../components/recipe/ImagePicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SortableStepItem } from '../components/recipe/SortableStepItem';
import type { Ingredient, Instruction } from '../types';

interface EditableInstruction extends Instruction {
  id: string;
}

const makeInstructionId = () => crypto.randomUUID();

// Matches a leading number (including fractions/decimals) and an optional fused unit suffix, e.g. "80g" → ["80","g"], "2" → ["2",""]
const NUMERIC_PREFIX = /^([\d.,/¼½¾⅓⅔⅛⅜⅝⅞]+)(.*)/;

function splitIngredientString(raw: string): Ingredient {
  const tokens = raw.trim().split(/\s+/);
  const match = NUMERIC_PREFIX.exec(tokens[0] ?? '');
  if (!match) return { amount: '', unit: '', name: raw.trim() };

  const amount = match[1];
  const fusedUnit = match[2]; // e.g. "g" from "80g", empty for "2"
  const rest = tokens.slice(1);

  if (fusedUnit) return { amount, unit: fusedUnit, name: rest.join(' ') };
  if (rest.length >= 2) return { amount, unit: rest[0], name: rest.slice(1).join(' ') };
  return { amount, unit: '', name: rest[0] ?? '' };
}

export default function RecipeEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id!);
  const { data: images } = useRecipeImages(id!, { pollUntilLoaded: true });
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<EditableInstruction[]>([]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const instructionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Populate the form only on first load of each recipe: image uploads invalidate
  // the recipe query, and the refetch must not overwrite unsaved edits.
  const initializedRecipeId = useRef<string | null>(null);
  useEffect(() => {
    if (recipe && initializedRecipeId.current !== recipe.id) {
      initializedRecipeId.current = recipe.id;
      setTitle(recipe.title);
      setIngredients(recipe.ingredients.length ? recipe.ingredients : [{ amount: '', unit: '', name: '' }]);
      const initialInstructions = recipe.instructions.length ? recipe.instructions : [{ step: 1, text: '' }];
      setInstructions(initialInstructions.map((inst) => ({ ...inst, id: makeInstructionId() })));
      setPrepTime(recipe.prepTime?.toString() || '');
      setCookTime(recipe.cookTime?.toString() || '');
      setServings(recipe.servings?.toString() || '');
      setNotes(recipe.notes || '');
      setTags(recipe.tags.map((t) => t.name));
    }
  }, [recipe]);

  const addIngredient = () => setIngredients([...ingredients, { amount: '', unit: '', name: '' }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  };
  const splitIngredient = (i: number) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[i] = splitIngredientString(updated[i]?.name ?? '');
      return updated;
    });
  };
  const splitAllIngredients = () => {
    setIngredients(prev => prev.map(ing => ing.amount === '' ? splitIngredientString(ing.name ?? '') : ing));
  };

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (!recipe) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">Recipe not found.</Text>
      </Box>
    );
  }
  if (recipe.ownerId !== user?.id) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
        <Text color="red.600">You don't have permission to edit this recipe.</Text>
      </Box>
    );
  }

  const addInstruction = () => setInstructions([...instructions, { step: instructions.length + 1, text: '', id: makeInstructionId() }]);
  const removeInstruction = (i: number) => {
    const filtered = instructions.filter((_, idx) => idx !== i).map((inst, idx) => ({ ...inst, step: idx + 1 }));
    setInstructions(filtered);
  };
  const updateInstruction = (i: number, text: string) => {
    const updated = [...instructions];
    updated[i] = { ...updated[i], text };
    setInstructions(updated);
  };
  const handleInstructionDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setInstructions((prev) => {
      const oldIndex = prev.findIndex((inst) => inst.id === active.id);
      const newIndex = prev.findIndex((inst) => inst.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((inst, idx) => ({ ...inst, step: idx + 1 }));
    });
  };

  const handleDelete = async () => {
    await deleteRecipe.mutateAsync(recipe.id);
    setConfirmDelete(false);
    navigate('/recipes');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateRecipe.mutateAsync({
        id: recipe.id,
        data: {
          title,
          ingredients: ingredients.filter((i) => i.name.trim()),
          instructions: instructions.filter((i) => i.text.trim()).map(({ step, text }) => ({ step, text })),
          prepTime: prepTime ? parseInt(prepTime) : undefined,
          cookTime: cookTime ? parseInt(cookTime) : undefined,
          servings: servings ? parseInt(servings) : undefined,
          notes: notes || undefined,
        },
      });
      await recipesApi.setTags(recipe.id, tags);
      navigate(`/recipes/${recipe.id}`);
    } catch {
      setSaveError('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
          <Heading size="lg">Edit Recipe</Heading>
          <HStack gap={2}>
            <Button variant="ghost" colorPalette="red" onClick={() => setConfirmDelete(true)}>Delete</Button>
            <Button variant="ghost" onClick={() => navigate(`/recipes/${recipe.id}`)}>Cancel</Button>
            <Button colorPalette="green" onClick={handleSave} loading={saving}>Save</Button>
          </HStack>
        </HStack>

        <ConfirmDialog
          open={confirmDelete}
          title="Delete recipe?"
          message={`"${title || recipe.title}" will be permanently deleted. This cannot be undone.`}
          loading={deleteRecipe.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />

        {saveError && (
          <Box w="full" p={3} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
            <Text color="red.600" fontSize="sm">{saveError}</Text>
          </Box>
        )}

        <Box w="full">
          <Text mb={1} fontWeight="medium" fontSize="sm">Title</Text>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} size="lg" fontWeight="semibold" />
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={3}>Images</Heading>
          <ImagePicker recipeId={recipe.id} images={images || []} coverImageId={recipe.coverImageId} />
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Heading size="sm">Ingredients</Heading>
            <HStack gap={2}>
              {ingredients.some(ing => ing.amount === '' && ing.name?.includes(' ')) && (
                <Button size="xs" variant="outline" colorPalette="blue" onClick={splitAllIngredients} title="Split all unparsed ingredient strings into amount / unit / name">
                  Split all
                </Button>
              )}
              <Button size="xs" onClick={addIngredient} colorPalette="green" variant="outline">+ Add</Button>
            </HStack>
          </HStack>
          <VStack gap={2}>
            {ingredients.map((ing, i) => (
              <HStack key={i} gap={{ base: 1, sm: 2 }} w="full">
                <Input
                  placeholder="Amount"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                  w={{ base: '56px', sm: '80px' }}
                  size="sm"
                />
                <Input
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  w={{ base: '56px', sm: '80px' }}
                  size="sm"
                />
                <Input
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  flex="1"
                  size="sm"
                />
                {ing.amount === '' && ing.name?.includes(' ') && (
                  <Button size="xs" variant="ghost" colorPalette="blue" onClick={() => splitIngredient(i)} title="Auto-split into amount / unit / name">
                    ↤
                  </Button>
                )}
                <Button size="xs" variant="ghost" colorPalette="red" onClick={() => removeIngredient(i)}>x</Button>
              </HStack>
            ))}
          </VStack>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <HStack justify="space-between" mb={3}>
            <Heading size="sm">Instructions</Heading>
            <Button size="xs" onClick={addInstruction} colorPalette="green" variant="outline">+ Add Step</Button>
          </HStack>
          <DndContext
            sensors={instructionSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleInstructionDragEnd}
          >
            <SortableContext items={instructions.map((inst) => inst.id)} strategy={verticalListSortingStrategy}>
              <VStack gap={3}>
                {instructions.map((inst, i) => (
                  <SortableStepItem
                    key={inst.id}
                    id={inst.id}
                    instruction={inst}
                    onChange={(text) => updateInstruction(i, text)}
                    onRemove={() => removeInstruction(i)}
                  />
                ))}
              </VStack>
            </SortableContext>
          </DndContext>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <Heading size="sm" mb={3}>Details</Heading>
          <HStack gap={4} flexWrap="wrap">
            <Box w="120px">
              <Text mb={1} fontSize="sm" fontWeight="medium">Prep time (min)</Text>
              <Input size="sm" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
            </Box>
            <Box w="120px">
              <Text mb={1} fontSize="sm" fontWeight="medium">Cook time (min)</Text>
              <Input size="sm" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
            </Box>
            <Box w="100px">
              <Text mb={1} fontSize="sm" fontWeight="medium">Servings</Text>
              <Input size="sm" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
            </Box>
          </HStack>
        </Box>

        <Box w="full">
          <Text mb={1} fontWeight="medium" fontSize="sm">Notes</Text>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes about this recipe..."
          />
        </Box>

        <Box w="full">
          <Text mb={1} fontWeight="medium" fontSize="sm">Tags</Text>
          <TagInput value={tags} onChange={setTags} />
        </Box>
      </VStack>
    </Box>
  );
}
