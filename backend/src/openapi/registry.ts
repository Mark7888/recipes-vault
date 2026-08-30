import { z } from 'zod';

/**
 * The one place a schema becomes a named component of the OpenAPI document.
 *
 * Schemas are registered where they are defined — next to the handler that
 * validates with them — so the published contract is generated from the code
 * that actually enforces it. There is no second, hand-written copy of any
 * request body to drift out of date.
 */
export const schemaRegistry = z.registry<{ id: string }>();

/** Registers `schema` as `#/components/schemas/<id>` and hands it straight back. */
export function component<T extends z.ZodType>(id: string, schema: T): T {
  schemaRegistry.add(schema, { id });
  return schema;
}

/** A `$ref` to a registered component, for use inside the document. */
export function ref(id: string): { $ref: string } {
  return { $ref: `#/components/schemas/${id}` };
}
