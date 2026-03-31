import { generateReportPdf } from "../pdf/reportPdf";
import * as Print from "expo-print";
import * as FS from "expo-file-system";
import { shareAsync } from "expo-sharing";

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: "tmp-uri" }),
}));
jest.mock("expo-file-system", () => ({
  cacheDirectory: "cache/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn(),
}));

describe("generateReportPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = {
    title: "Test Report",
    profileAreaHa: 1,
    effectiveArea: 1,
    landFactor: 1,
    production: [],
    cash: [],
    tools: [],
    extras: [],
    laborNonCashNom: 0,
    prettyLabel: (s: string) => s,
    share: true,
  };

  it("should generate and share PDF", async () => {
    const res = await generateReportPdf(mockParams);
    
    expect(Print.printToFileAsync).toHaveBeenCalled();
    expect(FS.moveAsync).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalled();
    expect(res.uri).toMatch(/Test Report\.pdf/);
  });

  it("should not share if share option is false", async () => {
    await generateReportPdf({ ...mockParams, share: false });
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
