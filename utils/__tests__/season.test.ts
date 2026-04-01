import { ensureDates } from "../season";

describe("season validation utils", () => {
  it("should not throw for valid dates", () => {
    expect(() => ensureDates("2023-01-01", "2023-01-02")).not.toThrow();
  });

  it("should throw for invalid date strings", () => {
    expect(() => ensureDates("invalid", "2023-01-01")).toThrow("Format tanggal tidak valid (YYYY-MM-DD).");
    expect(() => ensureDates("2023-01-01", "blah")).toThrow("Format tanggal tidak valid (YYYY-MM-DD).");
  });

  it("should throw if end date is before start date", () => {
    expect(() => ensureDates("2023-01-02", "2023-01-01")).toThrow(
      "Tanggal selesai harus setelah/sama dengan tanggal mulai."
    );
  });
});
