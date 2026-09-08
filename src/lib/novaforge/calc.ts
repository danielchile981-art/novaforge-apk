/** Safe arithmetic over a context of numbers. Used by tests and mirrored in the generated runtime. */
export function evalExpr(expr: string, ctx: Record<string, number>): number {
  const trimmed = expr.trim();
  if (!trimmed || !/^[0-9A-Za-z_+\-*/().\s]+$/.test(trimmed)) return 0;
  const keys = Object.keys(ctx);
  const values = keys.map((k) => {
    const n = ctx[k];
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  });
  try {
    const fn = new Function(...keys, `"use strict"; return (${trimmed});`);
    const result = fn(...values);
    return typeof result === "number" && Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
