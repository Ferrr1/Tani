export function normalizeUnitLabel(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/\./g, "");

  // kilogram
  if (["kg", "kilogram", "kilograms", "kilo", "kgs"].includes(s)) return "kg";

  // gram
  if (["g", "gr", "gram", "grams"].includes(s)) return "g";

  // liter
  if (["l", "lt", "ltr", "liter", "litre", "liters", "litres"].includes(s))
    return "L";

  // kalau bukan variasi di atas, biarkan apa adanya
  return input;
}
