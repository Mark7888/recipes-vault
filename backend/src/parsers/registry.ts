import type { Parser } from "./types.js";
import nosalty from "./sites/nosalty.parser.js";
import mindmegette from "./sites/mindmegette.parser.js";
import streetkitchen from "./sites/streetkitchen.parser.js";
import cookpad from "./sites/cookpad.parser.js";
import receptneked from "./sites/receptneked.parser.js";
import sobors from "./sites/sobors.parser.js";

const parsers: Map<string, Parser> = new Map([
  [nosalty.domain, nosalty],
  [mindmegette.domain, mindmegette],
  [streetkitchen.domain, streetkitchen],
  [cookpad.domain, cookpad],
  [receptneked.domain, receptneked],
  [sobors.domain, sobors],
]);

export function getParser(domain: string): Parser | undefined {
  return parsers.get(domain) ?? parsers.get(domain.replace(/^www\./, ""));
}
