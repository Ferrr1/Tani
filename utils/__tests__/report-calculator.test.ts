import { calculateRcRatio, calculateLandFactor, aggregateYearlyTotals, transformReportSeasonRows, transformReportYearRows } from "../report-calculator";

describe("utils/report-calculator", () => {
    describe("calculateRcRatio", () => {
        it("should calculate correctly", () => {
            expect(calculateRcRatio(120, 100)).toBe(1.2);
            expect(calculateRcRatio(200, 100)).toBe(2);
        });

        it("should handle zero cost", () => {
            expect(calculateRcRatio(100, 0)).toBe(0);
        });
    });

    describe("calculateLandFactor", () => {
        it("should calculate factor correctly", () => {
            expect(calculateLandFactor(1, 1.5)).toBe(1.5);
            expect(calculateLandFactor(2, 1)).toBe(0.5);
        });

        it("should handle null effective area", () => {
            expect(calculateLandFactor(2, null)).toBe(1);
        });
    });

    describe("aggregateYearlyTotals", () => {
        const rows = [
            { section: "penerimaan", label: "penerimaan MT 1", amount: 1000000 },
            { section: "biaya", label: "biaya tunai MT 1", amount: 500000 },
            { section: "biaya", label: "biaya non tunai MT 1", amount: 200000 },
            { section: "biaya", label: "biaya total MT 1", amount: 700000 },
            { section: "pendapatan", label: "pendapatan atas biaya tunai MT 1", amount: 500000 },
        ];

        it("should aggregate correctly with landFactor 1", () => {
            const totals = aggregateYearlyTotals(rows as any, 1);
            expect(totals.penerimaan).toBe(1000000);
            expect(totals.biayaTunai).toBe(500000);
            expect(totals.biayaTotal).toBe(700000);
            expect(totals.rcTunai).toBe(2);
        });
    });

    describe("transformReportSeasonRows", () => {
        it("should transform production and cash categories correctly", () => {
            const mockRows = [
                { section: "production", label: "Padi", qty: 100, unit: "kg", unit_price: 7000 },
                { section: "cash_detail", label: "Pupuk", name: "Urea", qty: 2, unit: "kg", unit_price: 5000 },
                { section: "cash_detail", label: "Biaya Lain", qty: null, amount: 20000 },
                { section: "cash_labor_total", qty: 5, unit_price: 100000 },
            ];

            const dataset = transformReportSeasonRows(mockRows, 1);

            expect(dataset.totalReceipts).toBe(700000);
            expect(dataset.cashByCategory).toContainEqual(expect.objectContaining({ category: "Pupuk|Urea", quantity: 2 }));
            expect(dataset.cashExtras).toContainEqual(expect.objectContaining({ label: "Biaya Lain", amount: 20000 }));
            expect(dataset.laborCashDetail?.amount).toBe(500000);
        });
    });

    describe("transformReportYearRows", () => {
        it("should transform year summary rows correctly", () => {
            const mockRows = [
                { section: "penerimaan", label: "MT 1", amount: 1000000 },
                { section: "biaya", label: "Biaya Tunai MT 1", amount: 400000 },
                { section: "biaya", label: "Biaya Total MT 1", amount: 600000 },
            ];

            const dataset = transformReportYearRows(mockRows, 1);

            expect(dataset.totalReceipts).toBe(1000000);
            expect(dataset.totalCash).toBe(400000);
            expect(dataset.totalCost).toBe(600000);
        });
    });
});
