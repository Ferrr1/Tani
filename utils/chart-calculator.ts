export type ExpenseItemRow = {
  expense_id: string;
  user_id: string;
  season_id: string;
  expense_date: string; // ISO
  year: number;
  type: "cash" | "noncash";
  expense_group: "cash" | "noncash" | "TK";
  row_key: string;
  item_kind: "material" | "labor" | "extra" | "tool" | "tax" | "hok";
  item_label: string | null;
  item_name: string | null;
  base_amount: number | null;
  tax_rate_percent: number;
  final_amount: number;
};

export type ExpensePieItem = {
    key: string;
    label: string;
    name: string | null;
    amount: number;
    kind: ExpenseItemRow["item_kind"];
    group: ExpenseItemRow["expense_group"];
};

/**
 * Transforms raw expense item rows into structured pie summary data.
 */
export function transformExpenseToPieSummary(items: ExpenseItemRow[]): ExpensePieItem[] {
    return items.map((r) => ({
        key: r.row_key,
        label: r.item_label ?? r.item_kind.toUpperCase(),
        name: r.item_name,
        amount: Number(r.final_amount) || 0,
        kind: r.item_kind,
        group: r.expense_group,
    }));
}

/**
 * Calculates total expenditure from pie summary items.
 */
export function calculateTotalExpense(summary: ExpensePieItem[]): number {
    return summary.reduce((s, x) => s + (Number(x.amount) || 0), 0);
}
