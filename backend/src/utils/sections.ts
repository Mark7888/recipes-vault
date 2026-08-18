import type {
  Ingredient,
  IngredientEntry,
  Instruction,
  InstructionEntry,
  RecipeSection,
} from '../types/index.js';

/**
 * Helpers for lists that mix real rows with section headings. Everything that
 * counts, numbers or consumes ingredients and steps has to skip the headings,
 * so the check lives in one place.
 */

export function isSection(entry: IngredientEntry | InstructionEntry | null | undefined): entry is RecipeSection {
  return !!entry && (entry as RecipeSection).type === 'section';
}

/** The ingredients themselves, without the headings between them. */
export function ingredientsOf(entries: IngredientEntry[]): Ingredient[] {
  return entries.filter((entry): entry is Ingredient => !isSection(entry));
}

/** The steps themselves, without the headings between them. */
export function stepsOf(entries: InstructionEntry[]): Instruction[] {
  return entries.filter((entry): entry is Instruction => !isSection(entry));
}

/**
 * Renumbers the steps 1..n in list order. Headings take no number, and the
 * count runs on across them — a recipe is cooked top to bottom whatever it is
 * divided into.
 */
export function renumberSteps(entries: InstructionEntry[]): InstructionEntry[] {
  let step = 0;
  return entries.map((entry) => (isSection(entry) ? entry : { ...entry, step: ++step }));
}

export function makeSection(title: string): RecipeSection {
  return { type: 'section', title };
}
