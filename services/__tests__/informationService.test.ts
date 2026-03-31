import { informationRepo } from "../informationService";
import { supabase } from "@/lib/supabase";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("informationRepo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch all active information", async () => {
      const mockData = [{ id: "i1", title: "Info 1" }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await informationRepo.list();

      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith("informations");
    });
  });

  describe("create", () => {
    it("should insert new information", async () => {
      const input = {
        title: "New Info",
        description: "Desc",
        isActive: true,
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "new-i", ...input }, error: null }),
      });

      const result = await informationRepo.create(input as any);

      expect(mockSupabase.from).toHaveBeenCalledWith("informations");
      expect(result.id).toBe("new-i");
    });

    it("should throw error if title is empty", async () => {
      await expect(informationRepo.create({ title: "", description: "D" } as any))
        .rejects.toThrow("Judul wajib diisi.");
    });
  });

  describe("update", () => {
    it("should update existing information", async () => {
      const input = {
        id: "i1",
        title: "Updated Info",
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "i1", title: "Updated Info" }, error: null }),
      });

      const result = await informationRepo.update(input as any);

      expect(result.title).toBe("Updated Info");
    });
  });

  describe("remove", () => {
    it("should delete information", async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      await informationRepo.remove("i1");

      expect(mockSupabase.from).toHaveBeenCalledWith("informations");
    });
  });
});
