import { receiptRepo } from "../receiptService";
import { supabase } from "@/lib/supabase";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("receiptRepo", () => {
    const userId = "user-123";
    const seasonId = "season-456";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("list", () => {
        it("should fetch receipts for user", async () => {
            const mockData = [{ id: "r1", user_id: userId }];
            const mockQuery: any = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
            };
            mockSupabase.from.mockReturnValue(mockQuery);

            const receipts = await receiptRepo.list(userId, { seasonId });

            expect(receipts).toEqual(mockData);
            expect(mockSupabase.from).toHaveBeenCalledWith("receipts");
        });
    });

    describe("create", () => {
        it("should handle receipt creation with ownership check", async () => {
            const input = {
                seasonId,
                itemName: "Padi",
                quantity: 100,
                unitType: "kg",
                unitPrice: 7000,
            };

            // Mock assertSeasonOwnership (maybeSingle)
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: seasonId, user_id: userId }, error: null }),
            });

            // Mock insert
            mockSupabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: "new-r", ...input }, error: null }),
            });

            const result = await receiptRepo.create(userId, input as any);

            expect(result.id).toBe("new-r");
            expect(mockSupabase.from).toHaveBeenCalledWith("receipts");
        });

        it("should throw error if season is not owned by user", async () => {
             const input = { seasonId, quantity: 10, unitType: "kg", unitPrice: 1000 };

             mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: seasonId, user_id: "other" }, error: null }),
            });

            await expect(receiptRepo.create(userId, input as any)).rejects.toThrow("Season bukan milik user ini.");
        });
    });

    describe("remove", () => {
        it("should delete receipt", async () => {
            mockSupabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({ error: null })),
            });

            await receiptRepo.remove(userId, "r1");

            expect(mockSupabase.from).toHaveBeenCalledWith("receipts");
        });
    });
});
