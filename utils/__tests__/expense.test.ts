import { ensurePosNum, ensureMoneyNum, ensureText, nullIfEmpty } from "../expense";

describe("expense validation utils", () => {
  describe("ensurePosNum", () => {
    it("should not throw for positive numbers", () => {
      expect(() => ensurePosNum(10, "Field")).not.toThrow();
    });

    it("should throw for 0 or negative numbers", () => {
      expect(() => ensurePosNum(0, "Field")).toThrow("Field harus angka > 0.");
      expect(() => ensurePosNum(-1, "Field")).toThrow("Field harus angka > 0.");
    });

    it("should throw for NaN", () => {
      expect(() => ensurePosNum(NaN, "Field")).toThrow();
    });
  });

  describe("ensureMoneyNum", () => {
    it("should not throw for 0 or positive numbers", () => {
      expect(() => ensureMoneyNum(0, "Field")).not.toThrow();
      expect(() => ensureMoneyNum(100, "Field")).not.toThrow();
    });

    it("should throw for negative numbers", () => {
      expect(() => ensureMoneyNum(-1, "Field")).toThrow("Field harus angka ≥ 0.");
    });
  });

  describe("ensureText", () => {
    it("should not throw for non-empty string", () => {
      expect(() => ensureText("hello", "Field")).not.toThrow();
    });

    it("should throw for empty or whitespace string", () => {
      expect(() => ensureText("", "Field")).toThrow("Field wajib diisi.");
      expect(() => ensureText("  ", "Field")).toThrow("Field wajib diisi.");
    });
  });

  describe("nullIfEmpty", () => {
    it("should return null for empty array", () => {
      expect(nullIfEmpty([])).toBe(null);
      expect(nullIfEmpty(null)).toBe(null);
      expect(nullIfEmpty(undefined)).toBe(null);
    });

    it("should return array for non-empty array", () => {
      const arr = [1, 2];
      expect(nullIfEmpty(arr)).toBe(arr);
    });
  });
});
