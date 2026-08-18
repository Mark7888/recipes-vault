import type { ParsedRecipe } from '../types/index.js';

/**
 * A parser returns the recipe's ingredients and instructions as entries: the
 * rows themselves, plus `{ type: 'section', title }` headings wherever the page
 * groups them ("For the dough", "For the filling"). A heading applies to
 * everything after it until the next one, so its position in the array is all
 * that places it, and a parser that has no groupings to report simply returns
 * the flat lists it always did.
 */
export interface Parser {
  domain: string;
  parse(html: string, url: string): Promise<ParsedRecipe>;
}
