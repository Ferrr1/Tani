import {
  fmtDate,
  formatWithOutYear,
  yearOf,
  fmtDMY,
  parseDMY,
  toISO,
  fromISOtoDMY,
  daysInclusive,
} from "../date";

describe("date util", () => {
  describe("fmtDate", () => {
    it("should format ISO string to id-ID date string", () => {
      const result = fmtDate("2023-12-31");
      expect(result).toMatch(/31/);
      expect(result).toMatch(/2023/);
    });
  });

  describe("formatWithOutYear", () => {
    it("should format ISO string without year", () => {
      const result = formatWithOutYear("2023-12-31");
      expect(result).toMatch(/31/);
    });
  });

  describe("yearOf", () => {
    it("should return the year of an ISO string", () => {
      expect(yearOf("2023-12-31")).toBe(2023);
    });
  });

  describe("fmtDMY", () => {
    it("should format Date to DD/MM/YYYY", () => {
      const d = new Date(2023, 11, 31); // Dec is 11
      expect(fmtDMY(d)).toBe("31/12/2023");
    });

    it("should return empty string for null", () => {
      expect(fmtDMY(null)).toBe("");
    });
  });

  describe("parseDMY", () => {
    it("should parse valid DD/MM/YYYY string", () => {
      const d = parseDMY("31/12/2023");
      expect(d?.getFullYear()).toBe(2023);
      expect(d?.getMonth()).toBe(11);
      expect(d?.getDate()).toBe(31);
    });

    it("should return null for invalid format", () => {
      expect(parseDMY("2023-12-31")).toBe(null);
      expect(parseDMY("32/12/2023")).toBe(null);
      expect(parseDMY("31/13/2023")).toBe(null);
    });
  });

  describe("toISO", () => {
    it("should format Date to YYYY-MM-DD", () => {
      const d = new Date(2023, 11, 31);
      expect(toISO(d)).toBe("2023-12-31");
    });
  });

  describe("fromISOtoDMY", () => {
    it("should convert ISO to DMY", () => {
      expect(fromISOtoDMY("2023-12-31")).toBe("31/12/2023");
    });
    it("should handle invalid ISO", () => {
      expect(fromISOtoDMY("invalid")).toBe("");
    });
  });

  describe("daysInclusive", () => {
    it("should calculate days between dates inclusively", () => {
      expect(daysInclusive("2023-01-01", "2023-01-01")).toBe(1);
      expect(daysInclusive("2023-01-01", "2023-01-05")).toBe(5);
    });

    it("should return 0 if end is before start", () => {
      expect(daysInclusive("2023-01-05", "2023-01-01")).toBe(0);
    });
  });
});
