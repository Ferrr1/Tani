import { useAuth } from "@/context/AuthContext";
import {
  transformReportSeasonRows,
  transformReportYearRows,
} from "@/utils/report-calculator";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useReportData } from "../reportService";
import { seasonRepo } from "../seasonService";

jest.mock("@/context/AuthContext");
jest.mock("@/lib/supabase", () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: jest.fn((cb) => cb({ data: [], error: null })),
  };
  return {
    supabase: {
      from: jest.fn(() => mockQuery),
    },
  };
});
jest.mock("../seasonService");
jest.mock("@/utils/report-calculator");

describe("useReportData hook", () => {
  const mockUser = { id: "user-123" };
  const mockSeasons = [
    { id: "s1", season_year: 2023, start_date: "2023-01-01" },
    { id: "s2", season_year: 2022, start_date: "2022-01-01" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (seasonRepo.list as jest.Mock).mockResolvedValue(mockSeasons);
  });

  it("should bootstrap seasons and year options", async () => {
    const { result } = renderHook(() => useReportData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.seasons).toEqual(mockSeasons);
    expect(result.current.yearOptions).toEqual([2022, 2023]);
    expect(result.current.seasonId).toBe("s1"); // latest by start_date
  });

  it("should change seasonId and year", async () => {
    const { result } = renderHook(() => useReportData());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSeasonId("s2");
      result.current.setYear(2022);
    });
    expect(result.current.seasonId).toBe("s2");
    expect(result.current.year).toBe(2022);
  });

  describe("buildDataset", () => {
    it("should call transformReportSeasonRows when seasonId is set", async () => {
      const { result } = renderHook(() => useReportData("s1"));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.buildDataset();
      });

      expect(transformReportSeasonRows).toHaveBeenCalled();
    });

    it("should call transformReportYearRows when seasonId is null (year mode)", async () => {
      const { result } = renderHook(() => useReportData("all"));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setSeasonId(undefined);
        result.current.setYear(2023);
      });

      await act(async () => {
        await result.current.buildDataset();
      });

      expect(transformReportYearRows).toHaveBeenCalled();
    });
  });
});
