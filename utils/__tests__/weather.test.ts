import { codeToText } from "../weather";

describe("weather util", () => {
  it("should return '-' for null code", () => {
    expect(codeToText(null)).toBe("-");
  });

  it("should translate common weather codes", () => {
    expect(codeToText(0)).toBe("Cerah");
    expect(codeToText(1)).toBe("Cerah berawan");
    expect(codeToText(3)).toBe("Berawan");
    expect(codeToText(61)).toBe("Hujan");
    expect(codeToText(95)).toBe("Badai petir");
  });

  it("should return '-' for unknown codes", () => {
    expect(codeToText(999)).toBe("-");
  });
});
