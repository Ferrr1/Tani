export const toNum = (input?: unknown): number => {
  if (input == null) return 0;
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input === "boolean") return input ? 1 : 0;
  let s = String(input).trim();
  if (!s) return 0;
  let isNeg = false;
  const m = s.match(/^\((.*)\)$/);
  if (m) {
    isNeg = true;
    s = m[1];
  }
  s = s.replace(/[^\d.,eE+\-]/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    s = s.split(thouSep).join("");
    s = s.replace(decSep, ".");
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 6) {
      s = parts[0].replace(/\./g, "") + "." + parts[1];
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 6) {
      s = parts[0].replace(/,/g, "") + "." + parts[1];
    } else {
      s = s.replace(/\./g, "");
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return isNeg ? -n : n;
};

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
