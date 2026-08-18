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

/**
 * A heading in the middle of an ingredient or instruction list ("For the bun",
 * "For the patty"). Sections sit in the same array as the rows they head, so
 * their position decides where the heading shows and dragging a row past one
 * moves it into the other section. Rows saved before sections existed have no
 * `type` at all, which is why only the section carries the discriminator.
 */
export interface RecipeSection {
  type: 'section';
  title: string;
}

export type IngredientEntry = Ingredient | RecipeSection;
export type InstructionEntry = Instruction | RecipeSection;

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

/** How a recipe got here. Absent on recipes captured before it was recorded. */
export type RecipeOrigin = 'MANUAL' | 'PARSED' | 'PARSED_EDITED' | 'AI_PARSED' | 'AI_GENERATED';

export interface Recipe {
  id: string;
  title: string;
  sourceUrl?: string;
  isFallback: boolean;
  origin?: RecipeOrigin;
  ingredients: IngredientEntry[];
  instructions: InstructionEntry[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
  shareToken?: string;
  ownerId: string;
  owner?: { id: string; username: string };
  coverImageId?: string;
  coverImage?: Image;
  images?: Image[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  bought: boolean;
  recipeId: string | null;
  recipeTitle: string | null;
  createdAt: string;
}

export interface ShoppingHistoryItem {
  name: string;
  amount: string;
  unit: string;
  recipeId: string | null;
  recipeTitle: string | null;
}

export interface ShoppingHistoryEntry {
  id: string;
  items: ShoppingHistoryItem[];
  createdAt: string;
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

export interface OwnershipTransfer {
  id: string;
  fromUser: { id: string; username: string };
  toUser: { id: string; username: string };
  createdAt: string;
}

export interface IncomingTransfer extends OwnershipTransfer {
  collection: Collection;
}

export interface Collection {
  id: string;
  name: string;
  members: CollectionMember[];
  recipes?: RecipeCollection[];
  _count?: { recipes: number };
  pendingTransfer?: OwnershipTransfer | null;
  createdAt: string;
}
