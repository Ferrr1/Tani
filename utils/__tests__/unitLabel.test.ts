import { normalizeUnitLabel } from "../unitLabel";

describe("normalizeUnitLabel", () => {
  it("should normalize kilograms", () => {
    expect(normalizeUnitLabel("Kg")).toBe("kg");
    expect(normalizeUnitLabel("kilograms")).toBe("kg");
    expect(normalizeUnitLabel("Kilo.")).toBe("kg");
  });

  it("should normalize grams", () => {
    expect(normalizeUnitLabel("g")).toBe("g");
    expect(normalizeUnitLabel("gr")).toBe("g");
    expect(normalizeUnitLabel("Gram")).toBe("g");
  });

  it("should normalize liters", () => {
    expect(normalizeUnitLabel("L")).toBe("L");
    expect(normalizeUnitLabel("LTR")).toBe("L");
    expect(normalizeUnitLabel("litres.")).toBe("L");
  });

  it("should return null for empty input", () => {
    expect(normalizeUnitLabel(null)).toBe(null);
    expect(normalizeUnitLabel("")).toBe(null);
  });

  it("should return original input if not in list", () => {
    expect(normalizeUnitLabel("ikat")).toBe("ikat");
    expect(normalizeUnitLabel("box")).toBe("box");
  });
});
