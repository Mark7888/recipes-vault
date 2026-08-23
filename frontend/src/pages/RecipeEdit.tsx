import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Heading, HStack, Input, VStack, Text, Textarea, Spinner
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useRecipe, useUpdateRecipe, useDeleteRecipe, useRecipeImages, useSetRecipeTags } from '../hooks/useRecipes';
import { useAiStatus } from '../hooks/useAi';
import { useAuthStore } from '../store/authStore';
import { TagInput } from '../components/recipe/TagInput';
import { ImagePicker } from '../components/recipe/ImagePicker';
import { AiReparseDialog } from '../components/recipe/AiReparseDialog';
import { AiRecipeActionsPopover } from '../components/recipe/AiRecipeActionsPopover';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SortableStepItem } from '../components/recipe/SortableStepItem';
import { SortableIngredientItem } from '../components/recipe/SortableIngredientItem';
import { SortableSectionItem } from '../components/recipe/SortableSectionItem';
import { getErrorMessage } from '../utils/errors';
import { isSection, renumberSteps } from '../utils/sections';
import type { Ingredient, IngredientEntry, InstructionEntry } from '../types';

// Both lists hold their section headings inline, so a row is either a real
// entry or a heading, and the id is what dnd-kit sorts on.
type EditableIngredient = IngredientEntry & { id: string };
type EditableInstruction = InstructionEntry & { id: string };

const newId = () => crypto.randomUUID();

/** Names what a capture failed to find, or null when it found both. */
function describeMissing(recipe: { ingredients: IngredientEntry[]; instructions: InstructionEntry[] }): string | null {
  // Headings alone are not content: a list of nothing but them is still empty.
  const noIngredients = !recipe.ingredients.some((entry) => !isSection(entry));
  const noSteps = !recipe.instructions.some((entry) => !isSection(entry));
  if (noIngredients && noSteps) return 'ingredients or steps';
  if (noIngredients) return 'ingredients';
  if (noSteps) return 'steps';
  return null;
}

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

/**
 * Drops the blank rows the editor always keeps around, and with them the
 * headings that end up heading nothing — an untitled section, or one left
 * with no rows under it once the empties are gone.
 */
function cleanEntries<T extends EditableIngredient | EditableInstruction>(entries: T[]): T[] {
  const kept = entries.filter((entry) =>
    isSection(entry)
      ? entry.title.trim().length > 0
      : 'name' in entry
        ? entry.name.trim().length > 0
        : entry.text.trim().length > 0
  );
  return kept.filter((entry, index) => !isSection(entry) || (kept[index + 1] !== undefined && !isSection(kept[index + 1])));
}

export default function RecipeEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id!);
  const { data: images } = useRecipeImages(id!, { pollUntilLoaded: true });
  const updateRecipe = useUpdateRecipe();
  const setRecipeTags = useSetRecipeTags();
  const deleteRecipe = useDeleteRecipe();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const aiStatus = useAiStatus();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [aiReparse, setAiReparse] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [instructions, setInstructions] = useState<EditableInstruction[]>([]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Populate the form only on first load of each recipe: image uploads invalidate
  // the recipe query, and the refetch must not overwrite unsaved edits.
  const initializedRecipeId = useRef<string | null>(null);
  const justLoadedRef = useRef(false);
  useEffect(() => {
    if (recipe && initializedRecipeId.current !== recipe.id) {
      initializedRecipeId.current = recipe.id;
      justLoadedRef.current = true;
      setTitle(recipe.title);
      const initialIngredients: IngredientEntry[] = recipe.ingredients.length ? recipe.ingredients : [{ amount: '', unit: '', name: '' }];
      setIngredients(initialIngredients.map((ing) => ({ ...ing, id: newId() })));
      const initialInstructions: InstructionEntry[] = recipe.instructions.length ? recipe.instructions : [{ step: 1, text: '' }];
      setInstructions(initialInstructions.map((inst) => ({ ...inst, id: newId() })));
      setPrepTime(recipe.prepTime?.toString() || '');
      setCookTime(recipe.cookTime?.toString() || '');
      setServings(recipe.servings?.toString() || '');
      setNotes(recipe.notes || '');
      setTags(recipe.tags.map((t) => t.name));
      setDirty(false);
    }
  }, [recipe]);

  // Skip the render right after population above — those setState calls land in
  // the same batch, so this only actually flips `dirty` on real user edits.
  useEffect(() => {
    if (justLoadedRef.current) { justLoadedRef.current = false; return; }
    setDirty(true);
  }, [title, ingredients, instructions, prepTime, cookTime, servings, notes, tags]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // A capture the parsers could not fully read lands here with ?aiSuggest=1.
  // The offer is one-shot — the flag is dropped either way — and only exists
  // for accounts that actually have the assistant.
  useEffect(() => {
    if (searchParams.get('aiSuggest') !== '1' || !recipe || aiStatus.isLoading) return;

    const missing = describeMissing(recipe);
    if (missing && recipe.sourceUrl && aiStatus.data?.enabled) setAiReparse(missing);

    const next = new URLSearchParams(searchParams);
    next.delete('aiSuggest');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, recipe, aiStatus.isLoading, aiStatus.data?.enabled]);

  const handleAiParsed = () => {
    setAiReparse(null);
    // The recipe on the server is a different one now, so let the refetch
    // repopulate the form rather than leaving the empty fields on screen.
    initializedRecipeId.current = null;
  };

  const addIngredient = () => setIngredients([...ingredients, { amount: '', unit: '', name: '', id: newId() }]);
  const addIngredientSection = () => setIngredients([...ingredients, { type: 'section', title: '', id: newId() }]);
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value } as EditableIngredient;
    setIngredients(updated);
  };
  const updateIngredientSection = (i: number, title: string) => {
    const updated = [...ingredients];
    updated[i] = { type: 'section', title, id: updated[i].id };
    setIngredients(updated);
  };
  const splitIngredient = (i: number) => {
    setIngredients(prev => prev.map((entry, idx) => (
      idx !== i || isSection(entry) ? entry : { ...splitIngredientString(entry.name ?? ''), id: entry.id }
    )));
  };
  const splitAllIngredients = () => {
    setIngredients(prev => prev.map(entry => (
      !isSection(entry) && entry.amount === '' ? { ...splitIngredientString(entry.name ?? ''), id: entry.id } : entry
    )));
  };
  const handleIngredientDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setIngredients((prev) => {
      const oldIndex = prev.findIndex((ing) => ing.id === active.id);
      const newIndex = prev.findIndex((ing) => ing.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  if (isLoading) return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  if (!recipe) {
    return (
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">Recipe not found.</Text>
      </Box>
    );
  }
  if (recipe.ownerId !== user?.id) {
    return (
      <Box p={4} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
        <Text color="fg.error">You don't have permission to edit this recipe.</Text>
      </Box>
    );
  }

  const addInstruction = () => setInstructions(renumberSteps([...instructions, { step: 0, text: '', id: newId() }]));
  const addInstructionSection = () => setInstructions([...instructions, { type: 'section', title: '', id: newId() }]);
  const removeInstruction = (i: number) => {
    setInstructions(renumberSteps(instructions.filter((_, idx) => idx !== i)));
  };
  const updateInstruction = (i: number, text: string) => {
    const updated = [...instructions];
    updated[i] = { ...updated[i], text } as EditableInstruction;
    setInstructions(updated);
  };
  const updateInstructionSection = (i: number, title: string) => {
    const updated = [...instructions];
    updated[i] = { type: 'section', title, id: updated[i].id };
    setInstructions(updated);
  };
  const handleInstructionDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setInstructions((prev) => {
      const oldIndex = prev.findIndex((inst) => inst.id === active.id);
      const newIndex = prev.findIndex((inst) => inst.id === over.id);
      // Steps are renumbered across headings: the recipe is still cooked top
      // to bottom, whatever it is divided into.
      return renumberSteps(arrayMove(prev, oldIndex, newIndex));
    });
  };

  const handleDelete = async () => {
    await deleteRecipe.mutateAsync(recipe.id);
    setConfirmDelete(false);
    navigate('/recipes');
  };

  const handleCancelClick = () => {
    if (dirty) setConfirmCancel(true);
    else navigate(`/recipes/${recipe.id}`);
  };

  const handleSave = async () => {
    try {
      await updateRecipe.mutateAsync({
        id: recipe.id,
        data: {
          title,
          ingredients: cleanEntries(ingredients).map((entry) =>
            isSection(entry) ? { type: 'section' as const, title: entry.title } : { amount: entry.amount, unit: entry.unit, name: entry.name }
          ),
          instructions: renumberSteps(cleanEntries(instructions)).map((entry) =>
            isSection(entry) ? { type: 'section' as const, title: entry.title } : { step: entry.step, text: entry.text }
          ),
          prepTime: prepTime ? parseInt(prepTime) : undefined,
          cookTime: cookTime ? parseInt(cookTime) : undefined,
          servings: servings ? parseInt(servings) : undefined,
          notes: notes || undefined,
          // A parse the user reworked before saving is recorded as such.
          modified: dirty,
        },
      });
      await setRecipeTags.mutateAsync({ id: recipe.id, tags });
      navigate(`/recipes/${recipe.id}`);
    } catch {
      // surfaced below via updateRecipe.isError / setRecipeTags.isError
    }
  };

  const saving = updateRecipe.isPending || setRecipeTags.isPending;
  const saveErrorMessage = updateRecipe.isError || setRecipeTags.isError
    ? getErrorMessage(updateRecipe.error ?? setRecipeTags.error, 'Failed to save recipe. Please try again.')
    : null;

  return (
    <Box maxW="800px" mx="auto" py={6}>
      <VStack align="start" gap={6}>
        <HStack justify="space-between" w="full" flexWrap="wrap" gap={2}>
          <Heading size="lg">Edit Recipe</Heading>
          <HStack gap={2} flexWrap="wrap" justify="flex-end">
            {aiStatus.data?.enabled && (
              <AiRecipeActionsPopover
                recipeId={recipe.id}
                sourceUrl={recipe.sourceUrl}
                dirty={dirty}
                onReworked={handleAiParsed}
              />
            )}
            <Button variant="ghost" colorPalette="red" onClick={() => setConfirmDelete(true)}>Delete</Button>
            <Button variant="ghost" onClick={handleCancelClick}>Cancel</Button>
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

        {aiReparse && recipe.sourceUrl && (
          <AiReparseDialog
            open
            recipeId={recipe.id}
            sourceUrl={recipe.sourceUrl}
            missing={aiReparse}
            onCancel={() => setAiReparse(null)}
            onParsed={handleAiParsed}
          />
        )}

        <ConfirmDialog
          open={confirmCancel}
          title="Discard changes?"
          message="You have unsaved changes. If you leave now, they will be lost."
          confirmLabel="Discard"
          onConfirm={() => navigate(`/recipes/${recipe.id}`)}
          onCancel={() => setConfirmCancel(false)}
        />

        {saveErrorMessage && (
          <Box w="full" p={3} bg="bg.error" borderRadius="md" borderWidth="1px" borderColor="border.error">
            <Text color="fg.error" fontSize="sm">{saveErrorMessage}</Text>
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
              {ingredients.some(entry => !isSection(entry) && entry.amount === '' && entry.name?.includes(' ')) && (
                <Button size="xs" variant="outline" colorPalette="blue" onClick={splitAllIngredients} title="Split all unparsed ingredient strings into amount / unit / name">
                  Split all
                </Button>
              )}
              <Button size="xs" onClick={addIngredientSection} variant="outline" title="Add a heading, e.g. For the bun">+ Section</Button>
              <Button size="xs" onClick={addIngredient} colorPalette="green" variant="outline">+ Add</Button>
            </HStack>
          </HStack>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleIngredientDragEnd}
          >
            <SortableContext items={ingredients.map((ing) => ing.id)} strategy={verticalListSortingStrategy}>
              <VStack gap={2}>
                {ingredients.map((entry, i) => (
                  isSection(entry) ? (
                    <SortableSectionItem
                      key={entry.id}
                      id={entry.id}
                      title={entry.title}
                      kind="ingredient"
                      onChange={(value) => updateIngredientSection(i, value)}
                      onRemove={() => removeIngredient(i)}
                    />
                  ) : (
                    <SortableIngredientItem
                      key={entry.id}
                      id={entry.id}
                      ingredient={entry}
                      onChange={(field, value) => updateIngredient(i, field, value)}
                      onSplit={() => splitIngredient(i)}
                      onRemove={() => removeIngredient(i)}
                    />
                  )
                ))}
              </VStack>
            </SortableContext>
          </DndContext>
        </Box>

        <Box w="full" borderTopWidth="1px" pt={4}>
          <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
            <Heading size="sm">Instructions</Heading>
            <HStack gap={2}>
              <Button size="xs" onClick={addInstructionSection} variant="outline" title="Add a heading, e.g. For the patty">+ Section</Button>
              <Button size="xs" onClick={addInstruction} colorPalette="green" variant="outline">+ Add Step</Button>
            </HStack>
          </HStack>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleInstructionDragEnd}
          >
            <SortableContext items={instructions.map((inst) => inst.id)} strategy={verticalListSortingStrategy}>
              <VStack gap={3}>
                {instructions.map((entry, i) => (
                  isSection(entry) ? (
                    <SortableSectionItem
                      key={entry.id}
                      id={entry.id}
                      title={entry.title}
                      kind="step"
                      onChange={(value) => updateInstructionSection(i, value)}
                      onRemove={() => removeInstruction(i)}
                    />
                  ) : (
                    <SortableStepItem
                      key={entry.id}
                      id={entry.id}
                      instruction={entry}
                      onChange={(text) => updateInstruction(i, text)}
                      onRemove={() => removeInstruction(i)}
                    />
                  )
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
