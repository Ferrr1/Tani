import {
    calcIncomeGrandTotal,
    getAvailableCrops,
    seasonHasFreeCrop,
    getDefaultSeasonId,
    buildIncomeCreatePayloads,
    buildIncomeUpdatePayload,
} from "../income-form-logic";

describe("income-form-logic utilities (Penerimaan Form)", () => {
    describe("calcIncomeGrandTotal", () => {
        it("should calculate correctly for multiple items", () => {
            const items = [
                { qty: "100", price: "5000" }, // 500,000
                { qty: "200", price: "2500" }, // 500,000
            ];
            expect(calcIncomeGrandTotal(items)).toBe(1000000);
        });

        it("should handle formatting characters", () => {
            const items = [{ qty: "1.000", price: "2.000" }]; // 2,000,000
            expect(calcIncomeGrandTotal(items)).toBe(2000000);
        });

        it("should return 0 for empty array", () => {
            expect(calcIncomeGrandTotal([])).toBe(0);
        });
    });

    describe("getAvailableCrops", () => {
        it("should filter out used crops regardless of case", () => {
            const all = ["Padi", "Jagung", "Cabai"];
            const used = new Set(["padi"]);
            expect(getAvailableCrops(all, used)).toEqual(["Jagung", "Cabai"]);
        });

        it("should return all crops if none used", () => {
            const all = ["Padi", "Jagung"];
            expect(getAvailableCrops(all, new Set())).toEqual(["Padi", "Jagung"]);
        });
    });

    describe("seasonHasFreeCrop", () => {
        const seasons = [{ id: "s1", crop_type: ["Padi", "Jagung"] }];
        
        it("should return true if some crops are free", () => {
            const usedBySeason = new Map([["s1", new Set(["padi"])]]);
            expect(seasonHasFreeCrop(seasons, "s1", usedBySeason)).toBe(true);
        });

        it("should return false if all crops are used", () => {
            const usedBySeason = new Map([["s1", new Set(["padi", "jagung"])]]);
            expect(seasonHasFreeCrop(seasons, "s1", usedBySeason)).toBe(false);
        });
    });

    describe("getDefaultSeasonId", () => {
        const seasons = [
            { id: "s1", season_no: 1, crop_type: ["Padi"] },
            { id: "s2", season_no: 2, crop_type: ["Jagung"] },
        ];

        it("should return the requested season if it has free crops", () => {
            const usedBySeason = new Map();
            expect(getDefaultSeasonId(seasons, "s1", usedBySeason)).toBe("s1");
        });

        it("should return first available season if requested is full", () => {
            const usedBySeason = new Map([["s1", new Set(["padi"])]]);
            expect(getDefaultSeasonId(seasons, "s1", usedBySeason)).toBe("s2");
        });

        it("should return undefined if all seasons are full", () => {
            const usedBySeason = new Map([
                ["s1", new Set(["padi"])],
                ["s2", new Set(["jagung"])],
            ]);
            expect(getDefaultSeasonId(seasons, "s1", usedBySeason)).toBeUndefined();
        });
    });

    describe("buildIncomeCreatePayloads", () => {
        it("should filter out incomplete rows and correctly parse numbers", () => {
            const items = [
                { cropName: "Padi", qty: "100", price: "5000", unit: "kilogram" },
                { cropName: "Jagung", qty: "0", price: "2500", unit: "kilogram" }, // invalid qty
                { cropName: "Cabai", qty: "50", price: "1000", unit: "" }, // invalid unit
            ];
            const payloads = buildIncomeCreatePayloads("s1", items);
            expect(payloads.length).toBe(1);
            expect(payloads[0]).toEqual({
                seasonId: "s1",
                itemName: "Padi",
                quantity: 100,
                unitType: "kilogram",
                unitPrice: 5000,
            });
        });
    });

    describe("buildIncomeUpdatePayload", () => {
        it("should construct valid update payload", () => {
            const payload = buildIncomeUpdatePayload("r1", "s1", "100", "kilogram", "5000");
            expect(payload).toEqual({
                id: "r1",
                seasonId: "s1",
                quantity: 100,
                unitType: "kilogram",
                unitPrice: 5000,
            });
        });

        it("should throw for invalid validation scenarios", () => {
            expect(() => buildIncomeUpdatePayload("r1", "s1", "0", "kilogram", "5000")).toThrow();
            expect(() => buildIncomeUpdatePayload("r1", "s1", "100", "", "5000")).toThrow();
        });
    });
});
