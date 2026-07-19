// Mirrors the backend merge math (shopping-list.service.ts) so the flat view
// can sum amounts of rows coming from different recipes for display.

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

export function addAmounts(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta) return tb;
  if (!tb) return ta;
  const pa = parseAmount(ta);
  const pb = parseAmount(tb);
  if (pa !== null && pb !== null) {
    return String(Math.round((pa + pb) * 100) / 100);
  }
  return `${ta} + ${tb}`;
}
