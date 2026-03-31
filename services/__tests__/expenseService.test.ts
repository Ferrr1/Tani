import { expenseRepo } from "../expenseService";
import { supabase } from "@/lib/supabase";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("expenseRepo", () => {
  const userId = "user-123";
  const seasonId = "season-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch expenses correctly", async () => {
      const mockData = [{ id: "exp-1", note: "Test" }];
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await expenseRepo.list(userId, { seasonId });

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith("v_expenses_with_totals_screen");
    });
  });

  describe("createCash", () => {
    it("should call create_cash_expense RPC with correct mapping", async () => {
      const input = {
        seasonId,
        note: "Beli bibit",
        expenseDate: "2024-01-01",
        items: [
          { category: "seed", itemName: "Jagung", quantity: 10, unitPrice: 5000, unit: "kg" },
          { category: "labor_nursery", itemName: "Tanam", quantity: 1, unitPrice: 50000, _meta: { laborType: "daily", peopleCount: 2, days: 1 } }
        ]
      };

      // Mock ownership checks
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: seasonId, user_id: userId }, error: null }),
      });

      // Mock RPC
      mockSupabase.rpc.mockResolvedValue({ data: "new-exp-id", error: null });

      // Mock getById (called after create)
      jest.spyOn(expenseRepo, 'getById').mockResolvedValue({ id: "new-exp-id" } as any);

      const result = await expenseRepo.createCash(userId, input as any);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("create_cash_expense", expect.objectContaining({
        p_user_id: userId,
        p_season_id: seasonId,
        p_materials: expect.arrayContaining([
          expect.objectContaining({ category: "seed", itemName: "Jagung" })
        ]),
        p_labors: expect.arrayContaining([
          expect.objectContaining({ laborType: "daily" })
        ])
      }));
      expect(result.id).toBe("new-exp-id");
    });
  });

  describe("remove", () => {
    it("should delete expense if owned by user", async () => {
      const expenseId = "exp-delete";
      
      // Mock ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: expenseId, user_id: userId }, error: null }),
      });

      // Mock delete
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await expenseRepo.remove(userId, expenseId);

      expect(mockSupabase.from).toHaveBeenCalledWith("expenses");
    });

    it("should throw error if not owned by user", async () => {
      const expenseId = "exp-other";
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: expenseId, user_id: "other-user" }, error: null }),
      });

      await expect(expenseRepo.remove(userId, expenseId))
        .rejects.toThrow("Data bukan milik user ini.");
    });
  });
});
