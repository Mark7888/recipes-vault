export interface User {
  id: string;
  username: string;
  createdAt: string;
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

export interface Image {
  id: string;
  recipeId: string;
  filePath: string;
  isCover: boolean;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  isFallback: boolean;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  ownerId: string;
  owner?: { id: string; username: string };
  coverImageId?: string;
  coverImage?: Image;
  images?: Image[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface CollectionMember {
  id: string;
  userId: string;
  collectionId: string;
  role: Role;
  user: { id: string; username: string };
}

export interface RecipeCollection {
  id: string;
  recipeId: string;
  collectionId: string;
  addedById: string;
  addedBy?: { id: string; username: string };
  recipe?: Recipe;
}

export interface Collection {
  id: string;
  name: string;
  members: CollectionMember[];
  recipes?: RecipeCollection[];
  _count?: { recipes: number };
  createdAt: string;
}
