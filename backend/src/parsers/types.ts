import type { ParsedRecipe } from '../types/index.js';

export interface Parser {
  domain: string;
  parse(html: string, url: string): Promise<ParsedRecipe>;
}
