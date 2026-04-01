import { supabase } from "@/lib/supabase";
import { operatorUserRepo } from "../operatorService";

// Mock Supabase
const mockSupabase = supabase as jest.Mocked<any>;

describe("operatorUserRepo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch users correctly with filters", async () => {
      const mockUsers = [{ id: "u1", full_name: "User One" }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      });

      const users = await operatorUserRepo.list();

      expect(users).toEqual(mockUsers);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });
  });

  describe("create", () => {
    it("should call admin-create-user edge function", async () => {
      const input = {
        email: "new@test.com",
        password: "password123",
        fullName: "New User",
        role: "user" as const,
        namaDesa: "Desa",
        luasLahan: 100,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { user: { id: "new-id", ...input } },
        error: null,
      });

      const result = await operatorUserRepo.create(input);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        "admin-create-user",
        expect.objectContaining({
          body: expect.objectContaining({
            email: "new@test.com",
            role: "user",
          }),
        }),
      );
      expect(result.id).toBe("new-id");
    });
  });

  describe("update", () => {
    it("should call edge function and rpc", async () => {
      const input = {
        targetUserId: "u123",
        newEmail: "new@test.com",
        newFullName: "New Name",
        newRole: "admin" as const,
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { ok: true },
        error: null,
      });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await operatorUserRepo.update(input);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        "admin-update-user",
        expect.any(Object),
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "admin_update_profile_only",
        expect.objectContaining({
          target_user_id: "u123",
          new_role: "admin",
        }),
      );
    });
  });

  describe("remove", () => {
    it("should call admin-delete-user edge function", async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { ok: true, selfDelete: false },
        error: null,
      });

      const result = await operatorUserRepo.remove("u123");

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        "admin-delete-user",
        {
          body: { targetUserId: "u123" },
        },
      );
      expect(result.selfDelete).toBe(false);
    });
  });
});
