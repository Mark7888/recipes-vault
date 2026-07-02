import type { Parser } from "./types.js";
import nosalty from "./sites/nosalty.parser.js";
import mindmegette from "./sites/mindmegette.parser.js";
import streetkitchen from "./sites/streetkitchen.parser.js";

const parsers: Map<string, Parser> = new Map([
  [nosalty.domain, nosalty],
  [mindmegette.domain, mindmegette],
  [streetkitchen.domain, streetkitchen],
]);

export function getParser(domain: string): Parser | undefined {
  return parsers.get(domain) ?? parsers.get(domain.replace(/^www\./, ""));
}
