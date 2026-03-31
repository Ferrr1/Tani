import { adminUserRepo } from "../adminUserService";
import { supabase } from "@/lib/supabase";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("adminUserRepo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch users correctly with defaults", async () => {
      const mockUsers = [{ id: "u1", full_name: "User One" }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      });

      const users = await adminUserRepo.list();

      expect(users).toEqual(mockUsers);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });

    it("should apply search filter if q is provided", async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await adminUserRepo.list({ q: "ferdi" });

      const fromMock = mockSupabase.from();
      expect(fromMock.or).toHaveBeenCalledWith(expect.stringContaining("full_name.ilike.%ferdi%"));
    });
  });

  describe("update", () => {
    it("should call edge function and rpc", async () => {
      const input = {
        targetUserId: "u123",
        newEmail: "new@test.com",
        newFullName: "New Name",
        newRole: "user" as const,
      };

      mockSupabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await adminUserRepo.update(input);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("admin-update-user", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith("admin_update_profile_only", expect.objectContaining({
        target_user_id: "u123",
        new_full_name: "New Name",
      }));
    });
  });

  describe("remove", () => {
    it("should call admin-delete-user edge function", async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: { ok: true, selfDelete: false }, error: null });

      const result = await adminUserRepo.remove("u123");

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("admin-delete-user", {
        body: { targetUserId: "u123" },
      });
      expect(result.selfDelete).toBe(false);
    });
  });
});
