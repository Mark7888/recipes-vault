import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export interface AdminRequest extends Request {
  adminScope: true;
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

export interface ParsedRecipe {
  title: string;
  sourceUrl?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  imageUrls: string[];
  tags?: string[];
  isFallback: boolean;
}
