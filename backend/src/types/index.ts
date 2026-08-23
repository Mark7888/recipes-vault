import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export interface AdminRequest extends Request {
  adminScope: true;
}

/**
 * What the AI gate leaves behind for the handlers past it: the user is known to
 * have access, and the language they want answers in has already been read.
 */
export interface AiRequest extends Request {
  userId: string;
  aiLanguage: string;
}

export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
}

export interface Instruction {
  step: number;
  text: string;
}

/**
 * A heading in the middle of an ingredient or instruction list ("For the bun",
 * "For the patty"). Sections live in the same array as the rows they head, so
 * their position is what decides where the heading shows up, and dragging a
 * row past one moves it into the other section.
 *
 * Entries stored before sections existed have no `type` at all, which is why
 * only the section carries the discriminator.
 */
export interface RecipeSection {
  type: 'section';
  title: string;
}

export type IngredientEntry = Ingredient | RecipeSection;
export type InstructionEntry = Instruction | RecipeSection;

export interface ParsedRecipe {
  title: string;
  sourceUrl?: string;
  ingredients: IngredientEntry[];
  instructions: InstructionEntry[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  imageUrls: string[];
  tags?: string[];
  isFallback: boolean;
}
