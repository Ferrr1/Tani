import { transformExpenseToPieSummary, calculateTotalExpense, ExpenseItemRow } from "../chart-calculator";

describe("utils/chart-calculator", () => {
    const mockItems: ExpenseItemRow[] = [
        {
            expense_id: "e1",
            user_id: "u1",
            season_id: "s1",
            expense_date: "2024-01-01",
            year: 2024,
            type: "cash",
            expense_group: "cash",
            row_key: "r1",
            item_kind: "material",
            item_label: "Pupuk",
            item_name: "Urea",
            base_amount: 100000,
            tax_rate_percent: 0,
            final_amount: 100000,
        },
        {
            expense_id: "e2",
            user_id: "u1",
            season_id: "s1",
            expense_date: "2024-01-02",
            year: 2024,
            type: "noncash",
            expense_group: "TK",
            row_key: "r2",
            item_kind: "labor",
            item_label: "Tandur",
            item_name: null,
            base_amount: 50000,
            tax_rate_percent: 0,
            final_amount: 50000,
        }
    ];

    describe("transformExpenseToPieSummary", () => {
        it("should transform rows correctly", () => {
            const summary = transformExpenseToPieSummary(mockItems);
            expect(summary).toHaveLength(2);
            expect(summary[0].label).toBe("Pupuk");
            expect(summary[1].amount).toBe(50000);
        });
    });

    describe("calculateTotalExpense", () => {
        it("should sum amounts correctly", () => {
            const summary = transformExpenseToPieSummary(mockItems);
            expect(calculateTotalExpense(summary)).toBe(150000);
        });
    });
});
