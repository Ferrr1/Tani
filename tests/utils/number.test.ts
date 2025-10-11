import { toNum } from "@/utils/number";
import { describe, expect, it } from "@jest/globals";

describe("toNum", () => {
  it("parses decimal with comma/dot", () => {
    expect(toNum("1,5")).toBe(1.5);
    expect(toNum("2.75")).toBe(2.75);
  });
  it("returns 0 for garbage", () => {
    expect(toNum("abc")).toBe(0);
    expect(toNum(undefined as any)).toBe(0);
  });
});
