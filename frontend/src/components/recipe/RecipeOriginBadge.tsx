import { Badge } from '@chakra-ui/react';
import type { RecipeOrigin } from '../../types';
import { RECIPE_ORIGIN_LABELS } from '../../utils/origin';

/**
 * Says how the recipe got here — typed in, parsed, parsed and then reworked,
 * or the AI's doing. Recipes captured before origins were recorded show
 * nothing at all: a guess would read as fact.
 */
export function RecipeOriginBadge({ origin }: { origin?: RecipeOrigin }) {
  if (!origin) return null;
  return <Badge colorPalette="orange">{RECIPE_ORIGIN_LABELS[origin]}</Badge>;
}
