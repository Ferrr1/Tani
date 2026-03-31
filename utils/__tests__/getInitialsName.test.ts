import { getInitialsName } from "../getInitialsName";

describe("getInitialsName", () => {
  it("should return initials for a single word", () => {
    expect(getInitialsName("Feri")).toBe("F");
  });

  it("should return initials for two words", () => {
    expect(getInitialsName("Feri Setya")).toBe("FS");
  });

  it("should return only the first two initials for three or more words", () => {
    expect(getInitialsName("Feri Setya Maulana")).toBe("FS");
  });

  it("should handle empty string", () => {
    expect(getInitialsName("")).toBe("");
  });
});
