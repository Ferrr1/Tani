import { toNum, formatThousands, onlyDigits, sum } from "../number";

describe("utils/number", () => {
    describe("toNum", () => {
        it("should handle null and undefined", () => {
            expect(toNum(null)).toBe(0);
            expect(toNum(undefined)).toBe(0);
        });

        it("should handle plain numbers", () => {
            expect(toNum(123)).toBe(123);
            expect(toNum(0)).toBe(0);
        });

        it("should handle Indonesian format (1.000,50)", () => {
            expect(toNum("1.000,50")).toBe(1000.5);
        });

        it("should handle US format (1,000.50)", () => {
            expect(toNum("1,000.50")).toBe(1000.5);
        });

        it("should handle simple thousands with dots (1.000)", () => {
            expect(toNum("1.000")).toBe(1000);
            expect(toNum("1.500.000")).toBe(1500000);
        });

        it("should handle decimals with dots (1.5)", () => {
            expect(toNum("1.5")).toBe(1.5);
            expect(toNum("1.50")).toBe(1.5);
        });

        it("should handle strings with non-numeric characters", () => {
            expect(toNum("Rp 1.000")).toBe(1000);
            expect(toNum("1.000 kg")).toBe(1000);
        });
    });

    describe("formatThousands", () => {
        it("should format numbers with dots", () => {
            expect(formatThousands(1000)).toBe("1.000");
            expect(formatThousands("1500000")).toBe("1.500.000");
        });

        it("should handle empty inputs", () => {
            expect(formatThousands("")).toBe("");
            expect(formatThousands(null)).toBe("");
        });
    });

    describe("onlyDigits", () => {
        it("should strip non-digits", () => {
            expect(onlyDigits("Rp 1.234,56")).toBe("123456");
        });
    });

    describe("sum", () => {
        it("should sum an array of numbers", () => {
            expect(sum([10, 20, 30])).toBe(60);
            expect(sum([])).toBe(0);
        });
    });
});
