import { currency } from "../currency";

describe("currency util", () => {
  it("should format IDR correctly", () => {
    // Note: depending on environment, it might use space, non-breaking space, or dot.
    // We test for the common characteristic: having 'Rp' and the value.
    const result = currency(1000000);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/1\.000\.000/);
  });

  it("should handle 0 correctly", () => {
    const result = currency(0);
    expect(result).toMatch(/0/);
  });

  it("should handle negative values", () => {
    const result = currency(-500);
    expect(result).toMatch(/-|−/); // Unicode minus or hyphen
    expect(result).toMatch(/500/);
  });
});
