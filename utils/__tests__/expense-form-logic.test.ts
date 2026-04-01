import {
    calcProrata,
    getStageKeyFromRow,
    validateCashSeeds,
    validateChemRows,
    buildNonCashPayload,
    buildCashPayload,
} from "../expense-form-logic";
import { ChemItem } from "@/types/expense";

describe("expense-form-logic utilities", () => {
    describe("calcProrata", () => {
        it("should calculate correctly for normal inputs", () => {
            // (1000000 / 365) * 73 = 200000
            expect(calcProrata(1000000, 73)).toBeCloseTo(200000, 0);
        });

        it("should handle string inputs", () => {
            expect(calcProrata("1000000", 73)).toBeCloseTo(200000, 0);
        });

        it("should return 0 if seasonDays is 0", () => {
            expect(calcProrata(1000000, 0)).toBe(0);
        });

        it("should handle invalid numeric strings", () => {
            expect(calcProrata("abc", 73)).toBe(0);
        });
    });

    describe("getStageKeyFromRow", () => {
        it("should map exact labels correctly", () => {
            expect(getStageKeyFromRow({ label: "persemaian" })).toBe("nursery");
            expect(getStageKeyFromRow({ label: "pengolahan lahan" })).toBe("land_prep");
            expect(getStageKeyFromRow({ label: "panen" })).toBe("harvest");
        });

        it("should handle variations and case insensitivity", () => {
            expect(getStageKeyFromRow({ label: "  SEMAI  " })).toBe("nursery");
            expect(getStageKeyFromRow({ label: "Olah Lahan" })).toBe("land_prep");
            expect(getStageKeyFromRow({ label: "Hama Penyakit" })).toBe("pest_ctrl");
            expect(getStageKeyFromRow({ label: "Pasca Panen" })).toBe("postharvest");
        });

        it("should return undefined for unknown labels", () => {
            expect(getStageKeyFromRow({ label: "unknown stage" })).toBeUndefined();
        });
    });

    describe("validateCashSeeds", () => {
        it("should return false for empty array", () => {
            expect(validateCashSeeds([])).toBe(false);
        });

        it("should return true for valid seeds", () => {
            const seeds = [{ qty: "10", price: "2000", unit: "kilogram", kind: "seed", cropName: "Padi" }];
            expect(validateCashSeeds(seeds)).toBe(true);
        });

        it("should return false if qty is zero or negative", () => {
            const seeds = [{ qty: "0", price: "2000", unit: "kilogram", kind: "seed", cropName: "Padi" }];
            expect(validateCashSeeds(seeds)).toBe(false);
        });

        it("should return false if unit is missing", () => {
            const seeds = [{ qty: "10", price: "2000", unit: "", kind: "seed", cropName: "Padi" }];
            expect(validateCashSeeds(seeds)).toBe(false);
        });
    });

    describe("validateChemRows", () => {
        it("should handle required flag", () => {
            expect(validateChemRows([], true)).toBe(false);
            expect(validateChemRows([], false)).toBe(true);
        });

        it("should validate row contents", () => {
            const rows: ChemItem[] = [{ id: "1", name: "Urea", qty: "50", price: "5000", unit: "kilogram", category: "fertilizer" }];
            expect(validateChemRows(rows)).toBe(true);

            const invalid = [{ id: "2", name: "", qty: "50", price: "5000", unit: "kilogram" } as any];
            expect(validateChemRows(invalid)).toBe(false);
        });
    });

    describe("buildNonCashPayload", () => {
        const mockForm: any = {
            labor: {
                nursery: { tipe: "harian", jumlahOrang: "2", jumlahHari: "1", upahHarian: "50000", jamKerja: "" },
                land_prep: { tipe: "borongan", hargaBorongan: "100000", upahBerlaku: "50000", jamKerja: "" }
            },
            extras: { tax: "10000", landRent: "0" }
        };

        it("should construct corect payload structure", () => {
            const payload = buildNonCashPayload(mockForm, [], []);
            expect(payload.labors.length).toBe(2);
            expect(payload.labors[0].stageLabel).toBe("Persemaian");
            expect(payload.labors[0].dailyWage).toBe(50000);
            expect(payload.labors[1].laborType).toBe("contract");
            expect(payload.extras[0].type).toBe("tax");
        });
    });
});
