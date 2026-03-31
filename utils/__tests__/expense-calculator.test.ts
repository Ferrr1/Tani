import {
    calculateSeedSubtotal,
    calculateChemOthersTotal,
    calculateLaborTotal,
    calculateProratedCost,
    calculateToolsTotal
} from "../expense-calculator";
import { ChemItem, LaborForm, SeedLine } from "@/types/expense";

describe("utils/expense-calculator", () => {
    describe("calculateSeedSubtotal", () => {
        it("should calculate total correctly", () => {
            const seeds: Partial<SeedLine>[] = [
                { qty: "10", price: "1000" }, // 10,000
                { qty: "5", price: "2000" },  // 10,000
            ];
            expect(calculateSeedSubtotal(seeds as SeedLine[])).toBe(20000);
        });

        it("should handle zero or negative inputs", () => {
            const seeds: Partial<SeedLine>[] = [
                { qty: "-1", price: "1000" },
                { qty: "0", price: "5000" },
            ];
            expect(calculateSeedSubtotal(seeds as SeedLine[])).toBe(0);
        });
    });

    describe("calculateProratedCost", () => {
        it("should prorate correctly", () => {
            // Yearly 365.000, Season 10 days -> 10.000
            expect(calculateProratedCost(365000, 10)).toBe(10000);
            expect(calculateProratedCost(730000, 365)).toBe(730000);
        });

        it("should handle zero season days", () => {
            expect(calculateProratedCost(1000000, 0)).toBe(0);
        });
    });

    describe("calculateToolsTotal", () => {
        it("should calculate tool total correctly", () => {
            const tools = [
                { jumlah: "2", hargaBeli: "50.000" }, // 100.000
                { jumlah: "1", hargaBeli: "150.000" }, // 150.000
            ];
            expect(calculateToolsTotal(tools)).toBe(250000);
        });
    });

    describe("calculateLaborTotal", () => {
        it("should calculate multiple labor stages", () => {
            const labor: Record<string, Partial<LaborForm>> = {
                nursery: { tipe: "harian", jumlahOrang: "2", jumlahHari: "1", upahHarian: "50000" }, // 100k
                planting: { tipe: "borongan", hargaBorongan: "500000" }, // 500k
            };
            expect(calculateLaborTotal(labor as Record<string, LaborForm>)).toBe(600000);
        });
    });
});
