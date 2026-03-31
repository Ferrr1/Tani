import { seasonRepo } from "../seasonService";
import { supabase } from "@/lib/supabase";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("seasonRepo", () => {
    const userId = "user-123";
    const seasonId = "season-1";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("list", () => {
        it("should fetch seasons for user", async () => {
            const mockData = [{ id: "s1", user_id: userId }];
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
            });

            const seasons = await seasonRepo.list(userId);

            expect(seasons).toEqual(mockData);
            expect(mockSupabase.from).toHaveBeenCalledWith("seasons");
        });
    });

    describe("create", () => {
        it("should call rpc_create_season and return new season", async () => {
            const input = {
                seasonNo: 1,
                seasonYear: 2024,
                startDate: "2024-01-01",
                endDate: "2024-04-01",
                cropType: "Padi",
            };

            mockSupabase.rpc.mockResolvedValue({ data: "new-id", error: null });
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: "new-id", ...input }, error: null }),
            });

            const result = await seasonRepo.create(userId, input as any);

            expect(mockSupabase.rpc).toHaveBeenCalledWith("rpc_create_season", expect.objectContaining({
                p_season_no: 1,
                p_crop_type: "Padi",
            }));
            expect(result.id).toBe("new-id");
        });

        it("should throw error if seasonNo < 1", async () => {
            await expect(seasonRepo.create(userId, { seasonNo: 0 } as any))
                .rejects.toThrow("Musim ke- harus angka ≥ 1.");
        });
    });

    describe("update", () => {
        it("should call rpc_update_season", async () => {
             const input = {
                id: seasonId,
                seasonNo: 2,
                startDate: "2024-02-01",
                endDate: "2024-05-01",
            };

            mockSupabase.rpc.mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: { ...input }, error: null }),
                single: jest.fn().mockResolvedValue({ data: { ...input }, error: null }),
            });

            const result = await seasonRepo.update(userId, input as any);

            expect(mockSupabase.rpc).toHaveBeenCalledWith("rpc_update_season", expect.objectContaining({
                p_id: seasonId,
                p_season_no: 2,
            }));
            expect(result.id).toBe(seasonId);
        });
    });

    describe("remove", () => {
        it("should call delete", async () => {
            mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({ error: null })),
            });

            await seasonRepo.remove(userId, seasonId);

            expect(mockSupabase.from).toHaveBeenCalledWith("seasons");
        });
    });
});
