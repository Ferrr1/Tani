export type CleanRecord = Record<string, unknown>;

export const omitNullish = <T extends CleanRecord>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as T;

export const toNum = (s?: string | number) => {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const v = parseFloat(String(s ?? "0").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

/** CASH ITEM */
export function makeCashItem(params: {
  label: string;
  quantity: number; // > 0
  unit_price: number; // >= 0
  metadata?: Record<string, unknown>;
}) {
  const { label, quantity, unit_price, metadata } = params;
  return omitNullish({
    kind: "cash",
    label: label?.trim() || "Item",
    quantity,
    unit_price,
    metadata: metadata ?? {},
  });
}

/** LABOR ITEM (NONCASH) */
export function makeLaborItem(params: {
  label?: string;
  people_count: number; // > 0
  days: number; // > 0
  daily_wage: number; // >= 0
  metadata?: Record<string, unknown>;
}) {
  const { label, people_count, days, daily_wage, metadata } = params;
  return omitNullish({
    kind: "labor",
    label: label?.trim() || "Tenaga kerja",
    people_count,
    days,
    daily_wage,
    metadata: metadata ?? {},
  });
}

/** TOOL ITEM (NONCASH) */
export function makeToolItem(params: {
  label: string;
  quantity: number; // > 0
  purchase_price: number; // >= 0
  useful_life_years?: number; // >= 0 (optional)
  salvage_value?: number; // >= 0 (optional)
  metadata?: Record<string, unknown>;
}) {
  const {
    label,
    quantity,
    purchase_price,
    useful_life_years,
    salvage_value,
    metadata,
  } = params;
  return omitNullish({
    kind: "tool",
    label: label?.trim() || "Alat",
    quantity,
    purchase_price,
    ...(useful_life_years != null ? { useful_life_years } : {}),
    ...(salvage_value != null ? { salvage_value } : {}),
    metadata: metadata ?? {},
  });
}

/** EXTRA ITEM (bisa dipakai di Cash & Noncash) */
export function makeExtraItem(params: {
  label?: string;
  extra_kind: "tax" | "land_rent" | "transport";
  amount: number; // >= 0
  quantity?: number; // default 1
  metadata?: Record<string, unknown>;
}) {
  const { label, extra_kind, amount, quantity = 1, metadata } = params;
  return omitNullish({
    kind: "extra",
    label:
      label?.trim() ||
      (extra_kind === "tax"
        ? "Pajak"
        : extra_kind === "land_rent"
        ? "Sewa Lahan"
        : "Transportasi"),
    quantity,
    unit_price: amount,
    extra_kind,
    metadata: metadata ?? {},
  });
}
