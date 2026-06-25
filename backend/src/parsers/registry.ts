import type { Parser } from "./types.js";
import nosalty from "./sites/nosalty.parser.js";
import mindmegette from "./sites/mindmegette.parser.js";

const parsers: Map<string, Parser> = new Map([
  [nosalty.domain, nosalty],
  [mindmegette.domain, mindmegette],
]);

export function getParser(domain: string): Parser | undefined {
  return parsers.get(domain) ?? parsers.get(domain.replace(/^www\./, ""));
}
