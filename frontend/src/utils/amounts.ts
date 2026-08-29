// Mirrors the backend merge math (shopping-list.service.ts) so the flat view
// can sum amounts of rows coming from different recipes for display, and
// scales those amounts when a recipe is cooked at a multiple of its own size.

function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  let m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return null;
}

/**
 * Renders a computed amount back into the plain text the list stores: at most
 * two decimals, trailing zeros dropped ("2", "1.5", "0.67"). Everything that
 * reads amounts again — the merge above, a later scaling — parses this back.
 */
export function formatAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function addAmounts(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta) return tb;
  if (!tb) return ta;
  const pa = parseAmount(ta);
  const pb = parseAmount(tb);
  if (pa !== null && pb !== null) {
    return formatAmount(pa + pb);
  }
  return `${ta} + ${tb}`;
}

/**
 * Multiplies an amount by a recipe scale. Anything readable as a number —
 * "2", "1,5", "1/2", "1 1/2", and ranges like "2-3" — comes back multiplied;
 * anything else ("a pinch", "to taste") is handed back untouched, because
 * there is no sensible way to double it.
 */
export function scaleAmount(raw: string, factor: number): string {
  const text = raw.trim();
  if (!text || factor === 1) return text;

  // A range keeps its dash: "2-3" at 2x is "4-6", not "10".
  const range = /^(.+?)\s*([-–—])\s*(.+)$/.exec(text);
  if (range) {
    const low = parseAmount(range[1]);
    const high = parseAmount(range[3]);
    if (low !== null && high !== null) {
      return `${formatAmount(low * factor)}${range[2]}${formatAmount(high * factor)}`;
    }
  }

  const value = parseAmount(text);
  return value === null ? text : formatAmount(value * factor);
}

/** "2", "1.5", "0.5" — how a scale factor reads in a button or a label. */
export function formatScale(factor: number): string {
  return formatAmount(factor);
}
